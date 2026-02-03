
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { GlossaryTerm, Project, Chapter } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const cleanJson = (text: string) => {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
  if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
};

/**
 * Xây dựng hướng dẫn hệ thống với "Khóa thuật ngữ" (Terminology Lock)
 */
const buildQTranslateProInstruction = (glossary: GlossaryTerm[]) => {
    const glossaryJson = JSON.stringify(glossary.reduce((acc, curr) => ({ ...acc, [curr.term]: curr.definition }), {}));

    return `Bạn là hệ thống QTranslate Pro - Trình dịch tiểu thuyết mạng cao cấp.
RÀNG BUỘC HỆ THỐNG:
1. LUÔN SỬ DỤNG THUẬT NGỮ ĐÃ KHÓA: ${glossaryJson}.
2. Phong cách: Văn phong tiểu thuyết mạng Việt Nam chuyên nghiệp (Tiên hiệp, Kiếm hiệp, Ngôn tình).
3. Đảm bảo câu văn mượt mà, thoát ý, không bị cứng nhắc theo Hán Việt.
4. Không giải thích, chỉ trả về bản dịch theo định dạng yêu cầu.`;
};

/**
 * Tự động trích xuất quy tắc mới từ ngữ cảnh bản dịch
 */
export const extractNewRules = async (original: string, translated: string): Promise<Partial<GlossaryTerm>[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Gốc: ${original}\nDịch: ${translated}\nTrích xuất các cặp thuật ngữ quan trọng (Tên riêng, Chiêu thức, Địa danh). Trả về mảng JSON {term, definition}.`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            term: { type: Type.STRING, description: "Từ gốc (Hán Việt/Trung)" },
                            definition: { type: Type.STRING, description: "Nghĩa dịch đề xuất" }
                        },
                        required: ["term", "definition"]
                    }
                }
            }
        });
        const cleaned = cleanJson(res.text || "[]");
        return JSON.parse(cleaned);
    } catch { return []; }
};

export const translateText = async (text: string, lang: string = 'Vietnamese', glossary: GlossaryTerm[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const res = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `DỊCH ĐOẠN NÀY:\n${text}`,
    config: { systemInstruction: buildQTranslateProInstruction(glossary) }
  }));
  return res.text?.trim() || "";
};

export const translateChapter = async (chapter: Chapter, project: Project, glossary: GlossaryTerm[]): Promise<{ title: string, content: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const res = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Sử dụng model Pro cho chất lượng dịch cao nhất
        contents: `TIÊU ĐỀ GỐC: ${chapter.titleOriginal}\nNỘI DUNG GỐC:\n${chapter.contentRaw}`,
        config: {
            systemInstruction: buildQTranslateProInstruction(glossary) + "\nYêu cầu trả về JSON với trường 'title' và 'content'.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Tiêu đề đã dịch" },
                    content: { type: Type.STRING, description: "Nội dung đã dịch" }
                },
                required: ["title", "content"]
            }
        }
    }));

    try {
        const cleaned = cleanJson(res.text || "{}");
        const parsed = JSON.parse(cleaned);
        return {
            title: parsed.title || "",
            content: parsed.content || ""
        };
    } catch (e) {
        console.error("Lỗi parse JSON dịch chương:", e);
        return { title: "", content: res.text || "" };
    }
};

export const generateSpeech = async (text: string, voiceName: string = 'Zephyr'): Promise<ArrayBuffer | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    return decode(base64Audio).buffer;
  } catch { return null; }
};

const retryWithBackoff = async <T>(op: () => Promise<T>, r = 3, d = 2000): Promise<T> => {
  let curr = d;
  for (let i = 0; i < r; i++) {
    try { return await op(); } catch (e: any) {
      if (e?.status === 429) { await delay(curr); curr *= 2; } else throw e;
    }
  }
  throw new Error("Retry failed");
};
