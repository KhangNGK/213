import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Project, Chapter } from '../types';
import { dataService } from '../services/dataService';
import { generateSpeech } from '../services/geminiService';

interface ReaderProps {
  project: Project;
  onBack: () => void;
}

type ReaderViewMode = 'INFO' | 'READING';
type TTSProvider = 'NATIVE' | 'GEMINI';

const GEMINI_VOICES = [
  { name: 'Zephyr', gender: 'female', label: 'Gemini AI (Nữ - Rành mạch)' },
  { name: 'Puck', gender: 'female', label: 'Gemini AI (Nữ - Truyền cảm)' },
  { name: 'Kore', gender: 'male', label: 'Gemini AI (Nam - Trầm ấm)' },
];

interface ParsedParagraph {
    id: number;
    sentences: {
        globalIndex: number;
        text: string;
    }[];
}

const Reader: React.FC<ReaderProps> = ({ project: initialProject, onBack }) => {
  const [project, setProject] = useState<Project>(initialProject);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ReaderViewMode>('INFO');
  
  // --- AUDIO STATE ---
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('GEMINI');
  
  // Settings
  const [audioRate, setAudioRate] = useState(1.0);
  const [audioPitch, setAudioPitch] = useState(1.0);
  const [nativeVoices, setNativeVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedNativeVoice, setSelectedNativeVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<string>('Zephyr');
  
  const [showChapterList, setShowChapterList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyNeeded, setShowKeyNeeded] = useState(false);
  
  // Content Parsing & Playback
  const [parsedContent, setParsedContent] = useState<ParsedParagraph[]>([]);
  const [audioQueue, setAudioQueue] = useState<string[]>([]); 
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0); 
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false); 

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const activeSentenceRef = useRef<HTMLSpanElement>(null); 

  // --- TTS CLEANER UTILITY ---
  const cleanTextForTTS = (text: string) => {
      if (!text) return "";
      return text
          .replace(/["'“”«»]/g, ' ') // Loại bỏ dấu ngoặc kép
          .replace(/!+/g, '.')       // Thay dấu chấm than bằng dấu chấm
          .replace(/\?+/g, '.')      // Thay dấu hỏi
          .replace(/\.\.\./g, '.')   // Tránh đọc "chấm chấm chấm"
          .replace(/[-–—]/g, ' ')    // Loại bỏ gạch ngang
          .replace(/\s+/g, ' ')      // Chuẩn hóa khoảng trắng
          .trim();
  };

  // 1. INITIAL LOAD
  useEffect(() => {
    const initReader = async () => {
      setLoading(true);
      const { data } = await dataService.fetchPublicChapters(project.id);
      setChapters(data);
      setLoading(false);
    };
    initReader();
  }, [project.id]);

  // 2. LOAD NATIVE VOICES
  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const langCode = project.targetLang.toLowerCase().includes('viet') ? 'vi' : 'en';
            const filtered = voices.filter(v => v.lang.toLowerCase().includes(langCode));
            setNativeVoices(filtered.length > 0 ? filtered : voices);
            
            const preferred = filtered.find(v => v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('hoai my')) 
                           || filtered[0] 
                           || voices[0];
            setSelectedNativeVoice(preferred);
        }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.cancel(); };
  }, [project.targetLang]);

  // 3. PARSE CONTENT
  useEffect(() => {
      if (currentChapter) {
          stopAudio(); 
          const title = currentChapter.titleTranslated || currentChapter.titleOriginal || "";
          const content = currentChapter.contentTranslated || (currentChapter as any).contentRaw || "";
          const rawParagraphs = content.split(/\n+/);
          const parsed: ParsedParagraph[] = [];
          const queue: string[] = [];
          let globalCounter = 0;

          if (title) {
              parsed.push({ id: -1, sentences: [{ globalIndex: globalCounter, text: title }] });
              queue.push(title);
              globalCounter++;
          }

          rawParagraphs.forEach((para, pIdx) => {
              if (!para.trim()) return;
              const rawSentences = para.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [para];
              const sentencesObj = rawSentences.map(s => {
                  const idx = globalCounter++;
                  queue.push(s.trim());
                  return { globalIndex: idx, text: s.trim() };
              });
              parsed.push({ id: pIdx, sentences: sentencesObj });
          });
          setParsedContent(parsed);
          setAudioQueue(queue);
          setCurrentQueueIndex(0);
          if (isAudioMode) setIsSpeaking(true);
      }
  }, [currentChapter]);

  // 4. MAIN AUDIO LOOP
  useEffect(() => {
      if (!isAudioMode || !isSpeaking || audioQueue.length === 0) return;
      if (currentQueueIndex >= audioQueue.length) { handleNext(); return; }
      
      const rawText = audioQueue[currentQueueIndex];
      const cleanedText = cleanTextForTTS(rawText);
      
      if (ttsProvider === 'NATIVE') {
          const utterance = new SpeechSynthesisUtterance(cleanedText);
          utterance.rate = audioRate;
          utterance.pitch = audioPitch;
          if (selectedNativeVoice) utterance.voice = selectedNativeVoice;
          utterance.onend = () => setCurrentQueueIndex(prev => prev + 1);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
      } else {
          playGeminiChunk(cleanedText);
      }

      if (activeSentenceRef.current) {
          activeSentenceRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [currentQueueIndex, isAudioMode, isSpeaking, audioQueue, ttsProvider, audioRate, audioPitch, selectedNativeVoice, selectedGeminiVoice]);

  async function decodePcmData(data: ArrayBuffer, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
      const dataInt16 = new Int16Array(data);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) {
              channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
          }
      }
      return buffer;
  }

  const playGeminiChunk = async (text: string) => {
      if (isLoadingAudio) return;
      setIsLoadingAudio(true);
      try {
          const audioBufferData = await generateSpeech(text, selectedGeminiVoice);
          if (!audioBufferData) throw new Error("No audio data");
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          const audioBuffer = await decodePcmData(audioBufferData, ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = audioRate;
          source.connect(ctx.destination);
          activeSourceNodeRef.current = source;
          source.onended = () => {
              setIsLoadingAudio(false);
              if (isAudioMode && isSpeaking) setCurrentQueueIndex(prev => prev + 1);
          };
          source.start();
      } catch (e: any) {
          console.error("Gemini TTS Error Details:", e);
          setIsLoadingAudio(false);
          
          // Kiểm tra lỗi 403 (Permission Denied) từ object lỗi của SDK
          const isPermissionError = 
              e.status === 403 || 
              e.code === 403 || 
              (e.error && (e.error.code === 403 || e.error.status === 'PERMISSION_DENIED')) ||
              (typeof e.message === 'string' && (e.message.includes('403') || e.message.includes('PERMISSION_DENIED'))) ||
              (e.response && e.response.status === 403);

          if (isPermissionError) { 
              setShowKeyNeeded(true); 
              stopAudio(); 
          } else { 
              // Bỏ qua câu lỗi và đọc câu tiếp theo
              setCurrentQueueIndex(prev => prev + 1); 
          }
      }
  };

  const stopAudio = () => {
      window.speechSynthesis.cancel();
      if (activeSourceNodeRef.current) {
          try { activeSourceNodeRef.current.stop(); } catch(e) {}
          activeSourceNodeRef.current = null;
      }
      setIsSpeaking(false);
      setIsLoadingAudio(false);
  };

  const handleNext = () => {
      const idx = chapters.findIndex(c => c.id === currentChapter?.id);
      if (idx !== -1 && idx < chapters.length - 1) {
          setCurrentChapter(chapters[idx + 1]);
          window.scrollTo(0, 0);
      } else {
          stopAudio();
          setIsAudioMode(false);
      }
  };

  const handlePrev = () => {
      const idx = chapters.findIndex(c => c.id === currentChapter?.id);
      if (idx > 0) {
          setCurrentChapter(chapters[idx - 1]);
          window.scrollTo(0, 0);
      }
  };

  const handleOpenChapter = (chapter: Chapter) => {
    setCurrentChapter(chapter);
    setViewMode('READING');
    setShowChapterList(false);
    window.scrollTo(0, 0);
  };

  const handleStartReading = () => {
    if (chapters.length > 0) handleOpenChapter(chapters[0]);
  };

  const toggleAudioMode = async () => {
      if (!isAudioMode) { 
          if (ttsProvider === 'GEMINI') {
              const hasKey = await (window as any).aistudio.hasSelectedApiKey();
              if (!hasKey) {
                  setShowKeyNeeded(true);
                  return;
              }
          }
          setIsAudioMode(true); 
          setIsSpeaking(true); 
      }
      else { 
          setIsAudioMode(false); 
          stopAudio(); 
      }
  };

  const handleOpenSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setShowKeyNeeded(false);
      setIsSpeaking(true);
      setIsAudioMode(true);
    } catch (e) {
      console.error("Error opening select key dialog:", e);
    }
  };

  const formatVoiceName = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      if (name.includes('google') && name.includes('vietnamese')) return 'com.google.android.tts';
      if (name.includes('hoai my')) return 'Hoài My (vi-VN)';
      if (name.includes('google')) return 'Google (Online)';
      if (name.includes('microsoft')) return 'Microsoft (Online)';
      return voice.name.split(' - ')[0] || voice.name;
  };

  const ReadingView = () => (
      <div className="min-h-screen bg-[#130e20] text-[#d1d5db] relative">
       {/* Top Nav */}
       <div className="sticky top-0 z-30 bg-[#130e20]/95 backdrop-blur-md border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between shadow-xl">
           <div className="flex items-center gap-4">
               <button onClick={() => { setIsAudioMode(false); stopAudio(); setViewMode('INFO'); }} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white">
                   <span className="material-symbols-outlined">arrow_back</span>
               </button>
               <div>
                   <h1 className="font-bold text-white text-sm md:text-base line-clamp-1">{project.title}</h1>
                   <p className="text-xs text-white/40">{currentChapter ? `Chương ${currentChapter.index}` : 'Đang tải...'}</p>
               </div>
           </div>
           <div className="flex items-center gap-2">
               <select 
                  className="bg-[#1c1230] border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none hidden md:block"
                  value={currentChapter?.id || ''}
                  onChange={(e) => {
                      const ch = chapters.find(c => c.id === e.target.value);
                      if (ch) handleOpenChapter(ch);
                  }}
               >
                   {chapters.map(c => (
                       <option key={c.id} value={c.id}>Ch. {c.index}: {c.titleTranslated || c.titleOriginal}</option>
                   ))}
               </select>
           </div>
       </div>

       {/* Content */}
       <div className="max-w-3xl mx-auto px-6 py-10 pb-40">
           {currentChapter ? (
               <div className="animate-in fade-in duration-500">
                   {parsedContent.map(para => (
                       <p key={para.id} className="mb-6 leading-loose text-lg font-editor">
                           {para.sentences.map(s => (
                               <span 
                                   key={s.globalIndex}
                                   ref={isAudioMode && currentQueueIndex === s.globalIndex ? activeSentenceRef : null}
                                   className={`transition-all duration-300 ${isAudioMode && currentQueueIndex === s.globalIndex ? 'bg-warning/20 text-warning font-semibold px-0.5 rounded shadow-sm' : ''}`}
                               >
                                   {s.text}{" "}
                               </span>
                           ))}
                       </p>
                   ))}
               </div>
           ) : <div className="text-center py-20 text-white/50">Không tìm thấy chương.</div>}
       </div>

       {/* Toolbar */}
       <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-[#1c1230]/95 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-2 flex items-center gap-3">
                <button onClick={() => setShowChapterList(!showChapterList)} className="px-4 py-2 rounded-full text-white/70 hover:text-white transition-colors"><span className="material-symbols-outlined">format_list_bulleted</span></button>
                <div className="h-6 w-px bg-white/10"></div>
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`size-10 rounded-full flex items-center justify-center transition-all ${showSettings ? 'bg-primary text-white' : 'bg-white/5 text-white/70 hover:text-white'}`}
                >
                    <span className="material-symbols-outlined">settings</span>
                </button>
                <button 
                    onClick={toggleAudioMode}
                    className={`px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${isAudioMode ? 'bg-danger text-white' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
                >
                    <span className="material-symbols-outlined">{isAudioMode ? 'stop' : 'headphones'}</span>
                    <span>{isAudioMode ? 'Dừng' : 'Nghe AI'}</span>
                </button>
            </div>
       </div>

       {/* Settings Popup */}
       {showSettings && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                <div className="relative w-full max-w-sm bg-[#282828] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                    <h2 className="text-xl font-bold text-white mb-6">Cài đặt</h2>
                    <div className="space-y-3 mb-8">
                        <label className="text-sm font-medium text-white/70">Nguồn nghe</label>
                        <div className="bg-white rounded-lg overflow-hidden border border-white/10 shadow-inner">
                            <div className="px-4 py-3 bg-white text-black border-b border-gray-100 font-bold text-sm flex justify-between items-center">
                                <span>
                                    {ttsProvider === 'GEMINI' 
                                        ? (GEMINI_VOICES.find(v => v.name === selectedGeminiVoice)?.label) 
                                        : (selectedNativeVoice ? formatVoiceName(selectedNativeVoice) : 'Chọn nguồn nghe...')}
                                </span>
                                <span className="material-symbols-outlined !text-sm text-gray-400">arrow_drop_down</span>
                            </div>
                            <div className="max-h-56 overflow-y-auto custom-scrollbar-light">
                                {GEMINI_VOICES.map(v => (
                                    <button 
                                        key={v.name}
                                        onClick={() => { setTtsProvider('GEMINI'); setSelectedGeminiVoice(v.name); stopAudio(); }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 flex items-center justify-between ${selectedGeminiVoice === v.name && ttsProvider === 'GEMINI' ? 'bg-[#e7f3ff] text-[#0066cc]' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-medium">{v.label}</span>
                                        {selectedGeminiVoice === v.name && ttsProvider === 'GEMINI' && <span className="material-symbols-outlined !text-sm">check</span>}
                                    </button>
                                ))}
                                {nativeVoices.map(v => {
                                    const formattedName = formatVoiceName(v);
                                    const isSelected = selectedNativeVoice?.name === v.name && ttsProvider === 'NATIVE';
                                    return (
                                        <button 
                                            key={v.name}
                                            onClick={() => { setTtsProvider('NATIVE'); setSelectedNativeVoice(v); stopAudio(); }}
                                            className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 flex items-center justify-between ${isSelected ? 'bg-[#e7f3ff] text-[#0066cc]' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="truncate flex-1 font-medium">{formattedName}</span>
                                            {isSelected && <span className="material-symbols-outlined !text-sm">check</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-white/70">Tốc độ</label>
                            <span className="text-xs font-bold text-primary">{audioRate.toFixed(2)}x</span>
                        </div>
                        <input 
                            type="range" min="0.5" max="3.0" step="0.1" value={audioRate}
                            onChange={(e) => setAudioRate(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                            style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((audioRate - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.1) ${((audioRate - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.1) 100%)` }}
                        />
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-white/70">Tông</label>
                            <span className="text-xs font-bold text-primary">{audioPitch.toFixed(2)}</span>
                        </div>
                        <input 
                            type="range" min="0.5" max="2.0" step="0.1" value={audioPitch}
                            onChange={(e) => setAudioPitch(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                            style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((audioPitch - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((audioPitch - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)` }}
                        />
                    </div>
                    <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold text-sm transition-colors mt-4">Đóng</button>
                </div>
           </div>
       )}

       {/* Chapter List Modal */}
       {showChapterList && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowChapterList(false)}></div>
               <div className="relative w-full max-w-md bg-[#1c1230] border border-white/10 rounded-2xl shadow-2xl max-h-[70vh] flex flex-col">
                   <div className="p-4 border-b border-white/5 flex items-center justify-between">
                       <h3 className="font-bold text-white">Mục Lục</h3>
                       <button onClick={() => setShowChapterList(false)} className="text-white/50 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2">
                       {chapters.map(c => (
                           <button key={c.id} onClick={() => handleOpenChapter(c)} className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors ${currentChapter?.id === c.id ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/5'}`}>
                               Chương {c.index}: {c.titleTranslated || c.titleOriginal}
                           </button>
                       ))}
                   </div>
               </div>
           </div>
       )}

       {/* Key Permission Modal */}
       {showKeyNeeded && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowKeyNeeded(false)}></div>
                <div className="relative w-full max-w-sm bg-[#1c1230] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="size-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-6"><span className="material-symbols-outlined !text-4xl">key</span></div>
                    <h3 className="text-xl font-bold text-white mb-2">Cần API Key Premium</h3>
                    <p className="text-sm text-text-muted mb-8 leading-relaxed">Giọng đọc Gemini AI yêu cầu sử dụng API Key từ một dự án có bật thanh toán (Paid Project). <br/><br/><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-primary hover:underline">Xem tài liệu về thanh toán</a></p>
                    <div className="flex flex-col gap-3">
                        <button onClick={handleOpenSelectKey} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg">Chọn API Key</button>
                        <button onClick={() => { setShowKeyNeeded(false); setTtsProvider('NATIVE'); setIsSpeaking(true); setIsAudioMode(true); }} className="text-xs text-text-muted hover:text-white">Dùng giọng hệ thống miễn phí</button>
                    </div>
                </div>
           </div>
       )}
       <style>{`
            input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: #0066cc; border: 2px solid white; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
            .custom-scrollbar-light::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar-light::-webkit-scrollbar-track { background: #f1f1f1; }
            .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
       `}</style>
    </div>
  );

  const InfoView = () => (
    <div className="w-full min-h-screen pb-20">
        <div className="sticky top-0 z-30 bg-[#130e20]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined !text-lg">arrow_back</span> Thư Viện
            </button>
        </div>
        <div className="relative w-full max-w-5xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-16">
                <div className="w-full md:w-64 flex-shrink-0">
                     <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                         {project.coverImage ? (
                             <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full bg-[#1c1230] flex items-center justify-center">
                                 <span className="material-symbols-outlined !text-6xl text-white/10">book_2</span>
                             </div>
                         )}
                     </div>
                </div>
                <div className="flex-1 space-y-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black font-display text-white mb-2">{project.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-text-muted">
                            <span>{project.author}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>{project.targetLang}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className="text-primary">{chapters.length} Chương</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Giới thiệu</h3>
                        <p className="text-white/70 leading-relaxed font-serif text-lg">{project.description || "Chưa có mô tả."}</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={handleStartReading}
                            disabled={chapters.length === 0}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-transform"
                        >
                            <span className="material-symbols-outlined">menu_book</span> Đọc Ngay
                        </button>
                    </div>
                </div>
            </div>

            {/* DANH SÁCH CHƯƠNG (MỤC LỤC) */}
            <div className="border-t border-white/5 pt-12 space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black font-display text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
                        Danh sách chương
                    </h2>
                    <span className="text-sm font-bold text-text-muted bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {chapters.length} Chương
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                    </div>
                ) : chapters.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-text-muted italic">Hiện tại chưa có chương nào được dịch.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {chapters.map((chapter) => (
                            <button
                                key={chapter.id}
                                onClick={() => handleOpenChapter(chapter)}
                                className="group p-4 bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-primary/5 rounded-xl text-left transition-all duration-300 flex items-start gap-4"
                            >
                                <span className="text-sm font-black text-white/30 group-hover:text-primary transition-colors min-w-[30px]">
                                    {chapter.index}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white group-hover:text-white transition-colors truncate mb-1">
                                        {chapter.titleTranslated || chapter.titleOriginal}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-text-muted group-hover:text-text-muted/80 uppercase tracking-wider">
                                            Chương {chapter.index}
                                        </span>
                                        <div className="size-1 rounded-full bg-white/10"></div>
                                        <span className="text-[10px] font-bold text-success/70 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-[10px]">check_circle</span>
                                            Đã dịch
                                        </span>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined !text-lg text-white/10 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                    arrow_forward
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  return viewMode === 'INFO' ? <InfoView /> : <ReadingView />;
};

export default Reader;