import { GoogleGenAI } from "@google/genai";
import { AIActionType, AITone } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateText = async (text: string, targetLanguage: string = 'English'): Promise<string> => {
  return generateContent(text, 'TRANSLATE', 'LITERARY', targetLanguage);
};

export const generateContent = async (
  text: string, 
  action: AIActionType, 
  tone: AITone = 'LITERARY', 
  contextArg: string = ''
): Promise<string> => {
  try {
    let systemInstruction = "You are a professional literary assistant for web novels.";
    let prompt = "";

    switch (action) {
      case 'TRANSLATE':
        systemInstruction += ` Translate the text into ${contextArg}. Maintain the narrative flow and character voice.`;
        prompt = `Translate this:\n\n${text}`;
        break;
      case 'REWRITE':
        systemInstruction += ` Rewrite the text to have a ${tone.toLowerCase()} tone. Improve flow and vocabulary without changing the meaning.`;
        prompt = `Rewrite this paragraph:\n\n${text}`;
        break;
      case 'SUMMARIZE':
        systemInstruction += ` Summarize the plot points concisely for an editor's review.`;
        prompt = `Summarize this chapter:\n\n${text}`;
        break;
      case 'PROOFREAD':
        systemInstruction += ` Fix grammar and spelling errors. Keep stylistic choices if they fit the narrative.`;
        prompt = `Proofread this:\n\n${text}`;
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "AI processing failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "An error occurred. Please try again.";
  }
};