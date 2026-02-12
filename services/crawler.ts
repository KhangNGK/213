
import { translateBatch } from './geminiService';
import { Project, Chapter } from '../types';

// --- PROXY ROTATION ---
// Sử dụng các dịch vụ Proxy mạnh để vượt qua CORS và tường lửa cơ bản
const PROXIES = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` // Fallback tốt cho text
];

// --- UTILS ---

const cleanText = (txt: string | undefined | null) => {
    if (!txt) return "";
    return txt.replace(/\s+/g, ' ').trim();
};

// Hàm lấy base URL để xử lý link tương đối (vd: /chuong-1 -> https://web.com/chuong-1)
const resolveUrl = (base: string, relative: string) => {
    try {
        return new URL(relative, base).href;
    } catch {
        return relative;
    }
};

const fetchHtml = async (url: string): Promise<string> => {
    let lastError;
    for (const makeProxy of PROXIES) {
        try {
            const res = await fetch(makeProxy(url), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; NovelCrawler/2.0)' }
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const text = await res.text();
            if (text.length > 500 && !text.includes('Access Denied')) return text;
        } catch (e) {
            lastError = e;
        }
    }
    throw new Error(`Không thể tải trang (CORS/Blocked). Lỗi: ${lastError}`);
};

// --- HEURISTIC ALGORITHMS (THUẬT TOÁN SUY LUẬN) ---

// 1. Logic tìm danh sách chương thông minh (Cluster Detection)
const findChapterList = (doc: Document, baseUrl: string) => {
    const allLinks = Array.from(doc.querySelectorAll('a'));
    
    // Regex nhận diện chapter mạnh
    const chapterRegex = /(?:chương|chapter|chap|hồi|quyển|tiết|phần|màn|第)\s*([0-9]+)/i;
    const numberRegex = /^([0-9]+)[\s.:-]/; // VD: "1. Mở đầu"

    // Chấm điểm từng link
    const candidates = allLinks.map(a => {
        const text = cleanText(a.textContent);
        const href = a.getAttribute('href');
        if (!href || href.length < 2 || href.startsWith('javascript') || href.startsWith('#')) return null;

        let score = 0;
        let chapterNum = -1;

        const matchFull = text.match(chapterRegex);
        const matchNum = text.match(numberRegex);

        if (matchFull) {
            score += 10;
            chapterNum = parseInt(matchFull[1]);
        } else if (matchNum) {
            score += 5;
            chapterNum = parseInt(matchNum[1]);
        }

        // Phạt link rác
        if (/mới nhất|đầu tiên|cuối cùng|đăng nhập|bình luận|facebook/i.test(text)) score -= 20;

        return { element: a, text, href: resolveUrl(baseUrl, href), score, chapterNum };
    }).filter(c => c !== null && c.score > 0);

    // Gom nhóm (Clustering): Tìm vùng cha chứa nhiều link chapter nhất
    const parentMap = new Map<HTMLElement, { count: number, links: typeof candidates }>();

    candidates.forEach(c => {
        const parent = c!.element.parentElement;
        if (parent) {
            // Traverse lên 3 cấp để tìm container chung (ul, div, table)
            let container = parent;
            for (let i = 0; i < 3; i++) {
                if (!container.parentElement) break;
                // Nếu container là thẻ danh sách hoặc table thì ưu tiên
                if (['UL', 'OL', 'TABLE', 'TBODY', 'DIV'].includes(container.tagName)) {
                    const current = parentMap.get(container) || { count: 0, links: [] };
                    current.count++;
                    current.links.push(c!);
                    parentMap.set(container, current);
                }
                container = container.parentElement as HTMLElement;
            }
        }
    });

    // Chọn container tốt nhất (nhiều link nhất)
    let bestContainer = null;
    let maxCount = 0;
    parentMap.forEach((val, key) => {
        if (val.count > maxCount) {
            maxCount = val.count;
            bestContainer = val;
        }
    });

    // Nếu tìm thấy, trả về danh sách link đã lọc và sắp xếp
    if (bestContainer) {
        // Deduplicate & Sort
        const unique = new Map();
        bestContainer.links.forEach((l: any) => {
            if (!unique.has(l.href)) unique.set(l.href, l);
        });
        
        return Array.from(unique.values())
            .sort((a: any, b: any) => a.chapterNum - b.chapterNum)
            .map((l: any, idx) => ({
                index: l.chapterNum > 0 ? l.chapterNum : idx + 1,
                title: l.text,
                url: l.href
            }));
    }

    return [];
};

// 2. Logic tìm nội dung chương (Density Scoring) - Dùng cho hàm fetchContent
const findContentElement = (doc: Document) => {
    // Xóa các phần tử gây nhiễu
    const scripts = doc.querySelectorAll('script, style, iframe, nav, header, footer, .ads, .comment, .sidebar');
    scripts.forEach(s => s.remove());

    const candidates = Array.from(doc.querySelectorAll('div, article, section'));
    let bestElement = null;
    let maxScore = 0;

    candidates.forEach(el => {
        // Tính điểm dựa trên độ dài text và số lượng thẻ <p>
        const textLen = el.textContent?.length || 0;
        const pCount = el.querySelectorAll('p').length;
        const brCount = el.querySelectorAll('br').length;
        
        // Công thức heuristic: Text dài + nhiều đoạn văn = Nội dung chính
        // Phạt nếu có quá nhiều link (thường là sidebar hoặc footer)
        const linkCount = el.querySelectorAll('a').length;
        const linkDensity = linkCount / (pCount + 1);

        if (linkDensity > 0.5) return; // Quá nhiều link -> Rác

        const score = textLen * 0.5 + pCount * 50 + brCount * 20;

        if (score > maxScore) {
            maxScore = score;
            bestElement = el;
        }
    });

    return bestElement;
};

// --- MAIN EXPORTS ---

export const fetchAndParseNovel = async (urlOrHtml: string, type: 'URL' | 'HTML'): Promise<{ project: Partial<Project>, chapters: Partial<Chapter>[] }> => {
    let html = urlOrHtml;
    const baseUrl = type === 'URL' ? urlOrHtml : window.location.origin;

    if (type === 'URL') {
        html = await fetchHtml(urlOrHtml);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. METADATA EXTRACTION (Generic Selectors)
    let title = cleanText(doc.querySelector('h1, .story-title, .book-title')?.textContent) || "Không tên";
    let author = cleanText(doc.querySelector('.author, [itemprop="author"], .info-author')?.textContent?.replace('Tác giả:', '')) || "Không rõ";
    let description = cleanText(doc.querySelector('.desc-text, .story-detail-content, .book-desc, [itemprop="description"]')?.textContent) || "";
    let coverImage = doc.querySelector('.book-img img, .story-cover img, [property="og:image"]')?.getAttribute('src') || "";

    if (coverImage && !coverImage.startsWith('http')) coverImage = resolveUrl(baseUrl, coverImage);

    // 2. CHAPTER LIST EXTRACTION (Heuristic)
    const rawChapters = findChapterList(doc, baseUrl);
    
    // Map to App Type
    let parsedChapters: Partial<Chapter>[] = rawChapters.map(c => ({
        index: c.index,
        titleOriginal: c.title,
        titleTranslated: c.title, // Để mặc định là gốc, sẽ dịch sau
        contentRaw: c.url, // Lưu URL để fetch sau
        status: 'raw' as const
    }));

    // Đánh lại index liên tục
    parsedChapters = parsedChapters.map((c, i) => ({ ...c, index: i + 1 }));

    // 3. AUTO TRANSLATE METADATA IF CHINESE
    const hasChinese = /[\u4e00-\u9fa5]/.test(title + description);
    if (hasChinese) {
        try {
            const metaBatch = [title, author, description.substring(0, 500)];
            const translated = await translateBatch(metaBatch);
            title = translated[0] || title;
            author = translated[1] || author;
            description = translated[2] || description;
            
            // Dịch 20 title đầu
            const titles = parsedChapters.slice(0, 20).map(c => c.titleOriginal!);
            if (titles.length > 0) {
                const transTitles = await translateBatch(titles);
                transTitles.forEach((t, i) => parsedChapters[i].titleTranslated = t);
            }
        } catch (e) { console.warn("Auto-translate meta failed", e); }
    }

    return {
        project: {
            title, author, description, coverImage,
            sourceLang: hasChinese ? 'Chinese' : 'Vietnamese',
            targetLang: 'Vietnamese',
            genres: ['Web Novel']
        },
        chapters: parsedChapters
    };
};

export const fetchChapterContent = async (url: string): Promise<string> => {
    if (!url.startsWith('http')) return url; // Đã là text

    try {
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const contentEl = findContentElement(doc);

        if (contentEl) {
            // Format văn bản: Thay <br> và <p> thành xuống dòng
            let text = contentEl.innerHTML;
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<\/p>/gi, '\n\n');
            
            // Strip tags còn lại
            const tmp = document.createElement('div');
            tmp.innerHTML = text;
            return tmp.textContent || "";
        }
        return "Không tìm thấy nội dung (Cấu trúc web quá phức tạp hoặc bị mã hóa Canvas).";
    } catch (e) {
        return `Lỗi tải nội dung: ${e}`;
    }
};
