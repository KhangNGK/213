
import { GlossaryTerm } from '../types';

export interface Token {
    original: string;
    translated: string;
    type: 'glossary' | 'vietphrase' | 'phienam' | 'symbol' | 'fallback' | 'name';
    thieuChuu?: string;
    lacViet?: string;
}

interface GrammarRule {
    regex: RegExp;
    template: string;
}

// Bộ nhớ đệm cho từ điển
const DICTIONARIES = {
    names: new Map<string, string>(), // Added Names dictionary
    vietphrase: new Map<string, string>(),
    phienam: new Map<string, string>(),
    thieuChuu: new Map<string, string>(),
    lacViet: new Map<string, string>(),
    ignoredList: new Set<string>(),
    ignoredPhrases: new Set<string>(),
    luatNhan: [] as GrammarRule[]
};

/**
 * Cấu trúc Trie cho thuật toán Longest Match First
 */
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    value: string | null = null;
}

const VIETPHRASE_TRIE = new TrieNode();
const NAMES_TRIE = new TrieNode(); // Added Trie for Names

const insertTrie = (root: TrieNode, word: string, value: string) => {
    let node = root;
    for (const char of word) {
        if (!node.children.has(char)) node.children.set(char, new TrieNode());
        node = node.children.get(char)!;
    }
    node.value = value;
};

const findLongestMatch = (root: TrieNode, text: string, start: number) => {
    let node = root;
    let lastMatch: { length: number; value: string } | null = null;
    for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (!node.children.has(char)) break;
        node = node.children.get(char)!;
        if (node.value !== null) {
            lastMatch = { length: i - start + 1, value: node.value };
        }
    }
    return lastMatch;
};

export const loadExternalDictionary = (content: string, type: keyof typeof DICTIONARIES, persist = false) => {
    if (persist && typeof window !== 'undefined') {
        localStorage.setItem(`dict_${type}`, content);
    }

    const lines = content.split('\n');
    lines.forEach(line => {
        if (!line.trim() || line.startsWith('//')) return;

        if (type === 'luatNhan') {
            const parts = line.split('=');
            if (parts.length === 2) {
                const pattern = parts[0].trim().replace(/\{0\}/g, '(.+?)');
                const template = parts[1].trim().replace(/\{0\}/g, '$1');
                DICTIONARIES.luatNhan.push({ regex: new RegExp(pattern, 'g'), template });
            }
        } else if (type === 'ignoredList' || type === 'ignoredPhrases') {
            DICTIONARIES[type].add(line.trim());
        } else {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts[1].trim();
                if (type === 'vietphrase') insertTrie(VIETPHRASE_TRIE, key, val);
                if (type === 'names') insertTrie(NAMES_TRIE, key, val);
                (DICTIONARIES[type] as Map<string, string>).set(key, val);
            }
        }
    });
};

// Initialize from storage
if (typeof window !== 'undefined') {
    ['names', 'vietphrase', 'phienam', 'thieuChuu', 'lacViet', 'ignoredList', 'ignoredPhrases', 'luatNhan'].forEach(type => {
        const stored = localStorage.getItem(`dict_${type}`);
        if (stored) {
            loadExternalDictionary(stored, type as any, false);
        }
    });
}

// --- PUBLIC DICTIONARY MANAGER ---
export const dictionaryManager = {
    getEntries: (type: 'names' | 'vietphrase' | 'phienam'): [string, string][] => {
        if (DICTIONARIES[type] instanceof Map) {
            return Array.from((DICTIONARIES[type] as Map<string, string>).entries());
        }
        return [];
    },
    addEntry: (type: 'names' | 'vietphrase' | 'phienam', key: string, value: string) => {
        const dict = DICTIONARIES[type] as Map<string, string>;
        dict.set(key, value);
        
        if (type === 'vietphrase') insertTrie(VIETPHRASE_TRIE, key, value);
        if (type === 'names') insertTrie(NAMES_TRIE, key, value);

        // Simple persist
        if (typeof window !== 'undefined') {
            const content = Array.from(dict.entries()).map(([k, v]) => `${k}=${v}`).join('\n');
            localStorage.setItem(`dict_${type}`, content);
        }
    },
    deleteEntry: (type: 'names' | 'vietphrase' | 'phienam', key: string) => {
         const dict = DICTIONARIES[type] as Map<string, string>;
         if (dict.has(key)) {
             dict.delete(key);
             // Note: Deleting from Trie is complex, requiring rebuild. 
             // For this app's scale, we rely on the Map for management and tolerate stale Trie entries until reload 
             // OR we could rebuild trie here if needed.
             
             if (typeof window !== 'undefined') {
                const content = Array.from(dict.entries()).map(([k, v]) => `${k}=${v}`).join('\n');
                localStorage.setItem(`dict_${type}`, content);
            }
         }
    }
};

export const ruleBasedTokenize = (text: string, glossary: GlossaryTerm[] = []): Token[] => {
    if (!text) return [];

    // Tạo Trie tạm thời cho Glossary dự án (ưu tiên cao nhất)
    const glossaryTrie = new TrieNode();
    glossary.forEach(g => insertTrie(glossaryTrie, g.term, g.definition));

    const tokens: Token[] = [];
    let i = 0;

    while (i < text.length) {
        // 1. Kiểm tra Glossary (Project Specific)
        const gMatch = findLongestMatch(glossaryTrie, text, i);
        if (gMatch) {
            tokens.push({
                original: text.substring(i, i + gMatch.length),
                translated: gMatch.value,
                type: 'glossary'
            });
            i += gMatch.length; continue;
        }

        // 2. Kiểm tra Names (Common Names.txt)
        const nMatch = findLongestMatch(NAMES_TRIE, text, i);
        if (nMatch) {
            tokens.push({
                original: text.substring(i, i + nMatch.length),
                translated: nMatch.value,
                type: 'name'
            });
            i += nMatch.length; continue;
        }

        // 3. Kiểm tra VietPhrase
        const vMatch = findLongestMatch(VIETPHRASE_TRIE, text, i);
        if (vMatch) {
            const original = text.substring(i, i + vMatch.length);
            tokens.push({
                original,
                translated: vMatch.value,
                type: 'vietphrase',
                thieuChuu: DICTIONARIES.thieuChuu.get(original),
                lacViet: DICTIONARIES.lacViet.get(original)
            });
            i += vMatch.length; continue;
        }

        // 4. Ký tự đặc biệt
        const char = text[i];
        if (/[。，！？“”：；（）\s\n\r\t]/.test(char)) {
            tokens.push({ original: char, translated: char, type: 'symbol' });
            i++; continue;
        }

        // 5. Fallback Hán Việt đơn ký tự
        const phienAm = DICTIONARIES.phienam.get(char) || char;
        tokens.push({
            original: char,
            translated: phienAm,
            type: 'phienam',
            thieuChuu: DICTIONARIES.thieuChuu.get(char),
            lacViet: DICTIONARIES.lacViet.get(char)
        });
        i++;
    }
    return tokens;
};

export const ruleBasedTranslate = (text: string, glossary: GlossaryTerm[] = []): string => {
    let cleanText = text;

    // Lọc Ignored List
    DICTIONARIES.ignoredList.forEach(item => cleanText = cleanText.replace(new RegExp(item, 'gi'), ''));
    DICTIONARIES.ignoredPhrases.forEach(item => cleanText = cleanText.replace(new RegExp(item, 'g'), ''));

    const tokens = ruleBasedTokenize(cleanText, glossary);
    
    // Nối bản dịch thô
    let result = tokens.map((t, idx) => {
        if (t.type === 'symbol') return t.translated;
        const next = tokens[idx + 1];
        const space = (next && next.type !== 'symbol' && t.translated !== '\n') ? ' ' : '';
        return t.translated.split('/')[0] + space; // Lấy nghĩa đầu tiên nếu có nhiều nghĩa
    }).join('');

    // Áp dụng Luật Nhân (Grammar Rules)
    DICTIONARIES.luatNhan.forEach(rule => {
        result = result.replace(rule.regex, rule.template);
    });

    return result.replace(/ +/g, ' ').trim();
};
