
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Project, Chapter, ChapterStatus, GlossaryTerm } from '../types';
import { dataService } from '../services/dataService';
import { translateChapter } from '../services/geminiService';
import { ruleBasedTokenize, ruleBasedTranslate, Token } from '../services/ruleBasedService';

interface ChapterEditorProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (project: Project) => void;
}

type EditorMode = 'RAW' | 'TRANSLATE' | 'PARALLEL';

const ChapterEditor: React.FC<ChapterEditorProps> = ({ project, onBack, onUpdateProject }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editorMode, setEditorMode] = useState<EditorMode>('PARALLEL');
  const [saving, setSaving] = useState(false);
  const [isTranslatingChapter, setIsTranslatingChapter] = useState(false);
  
  // Filter & Multi-select States
  const [chapterFilter, setChapterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChapterStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // QTranslate Selection State
  const [qtSelection, setQtSelection] = useState<{
      raw: string;
      tokens: Token[];
  } | null>(null);

  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const translatedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const activeChapter = chapters.find(c => c.id === activeChapterId);
  
  // Scroll Sync Ref
  const isScrolling = useRef<'raw' | 'translated' | null>(null);

  // Logic Filter
  const filteredChapters = useMemo(() => {
      return chapters.filter(c => {
          const matchesSearch = (c.titleOriginal + c.titleTranslated).toLowerCase().includes(chapterFilter.toLowerCase());
          const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
          return matchesSearch && matchesStatus;
      });
  }, [chapters, chapterFilter, statusFilter]);

  useEffect(() => {
    const load = async () => {
      const isLocal = project.id.startsWith('local-');
      let c: Chapter[] = [], g: GlossaryTerm[] = [];
      if (isLocal) {
          c = JSON.parse(localStorage.getItem(`chapters-${project.id}`) || '[]');
          g = JSON.parse(localStorage.getItem(`glossary-${project.id}`) || '[]');
      } else {
          const [cr, gr] = await Promise.all([dataService.fetchChapters(project.id), dataService.fetchGlossary(project.id)]);
          if (cr.data) c = cr.data;
          if (gr.data) g = gr.data;
      }
      setChapters(c); setGlossaryTerms(g);
      if (c.length > 0 && !activeChapterId) setActiveChapterId(c[0].id);
    };
    load();
  }, [project.id]);

  const handleUpdateContent = useCallback((updates: Partial<Chapter>, chapterId?: string) => {
      const targetId = chapterId || activeChapterId;
      if (!targetId) return;
      
      setChapters(prev => {
          const next = prev.map(c => c.id === targetId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
          if (project.id.startsWith('local-')) {
              localStorage.setItem(`chapters-${project.id}`, JSON.stringify(next));
          }
          return next;
      });
      setSaving(true);
      setTimeout(() => setSaving(false), 500);
  }, [activeChapterId, project.id]);

  // --- ACTIONS ---

  const handleRuleTranslate = (chapter: Chapter) => {
      const result = ruleBasedTranslate(chapter.contentRaw, glossaryTerms);
      handleUpdateContent({ contentTranslated: result, status: 'draft' }, chapter.id);
  };

  const handleRuleTranslateFullChapter = () => {
    if (activeChapter) {
        handleRuleTranslate(activeChapter);
    }
  };

  const handleBatchRuleTranslate = () => {
      if (selectedIds.size === 0) return;
      chapters.forEach(c => {
          if (selectedIds.has(c.id)) handleRuleTranslate(c);
      });
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
  };

  const handleBatchStatusUpdate = (status: ChapterStatus) => {
      selectedIds.forEach(id => handleUpdateContent({ status }, id));
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
  };

  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleScanConsistency = () => {
      if (!activeChapter) return;
      const result = ruleBasedTranslate(activeChapter.contentRaw, glossaryTerms);
      handleUpdateContent({ contentTranslated: result });
      alert("Đã quét và cập nhật nhất quán theo từ điển!");
  };

  const handleRawSelect = () => {
      if (!rawTextareaRef.current) return;
      const textarea = rawTextareaRef.current;
      const sel = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
      if (!sel || sel.length < 1) { setQtSelection(null); return; }
      const tokens = ruleBasedTokenize(sel, glossaryTerms);
      setQtSelection({ raw: sel, tokens });
  };

  const handleQtInsert = (t: string) => {
      if (!translatedTextareaRef.current) return;
      const ta = translatedTextareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const currentVal = activeChapter?.contentTranslated || "";
      const newVal = currentVal.substring(0, start) + t + currentVal.substring(end);
      
      handleUpdateContent({ contentTranslated: newVal });
      setQtSelection(null);
      
      // Restore cursor and focus
      setTimeout(() => {
          if (translatedTextareaRef.current) {
              translatedTextareaRef.current.focus();
              const newCursorPos = start + t.length;
              translatedTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
      }, 0);
  };

  // --- SCROLL SYNC ---
  const handleScroll = (source: 'raw' | 'translated') => {
      if (isScrolling.current && isScrolling.current !== source) return;
      isScrolling.current = source;
      
      const srcEl = source === 'raw' ? rawTextareaRef.current : translatedTextareaRef.current;
      const targetEl = source === 'raw' ? translatedTextareaRef.current : rawTextareaRef.current;
      
      if (srcEl && targetEl) {
          // Calculate percentage to handle different heights if fonts/content differ significantly
          // For now, direct scrollTop sync is often sufficient for parallel views
          const percentage = srcEl.scrollTop / (srcEl.scrollHeight - srcEl.clientHeight);
          const targetScrollTop = percentage * (targetEl.scrollHeight - targetEl.clientHeight);
          targetEl.scrollTop = targetScrollTop;
      }
      
      clearTimeout((window as any).scrollTimeout);
      (window as any).scrollTimeout = setTimeout(() => {
          isScrolling.current = null;
      }, 50);
  };

  return (
    <div className="flex h-screen w-full bg-bg-main overflow-hidden font-ui">
        {/* SIDEBAR */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} flex-shrink-0 bg-bg-panel border-r border-white/5 transition-all duration-300 flex flex-col z-30 overflow-hidden`}>
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <button onClick={onBack} className="text-[10px] font-bold uppercase text-text-muted hover:text-white transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined !text-sm">arrow_back</span> Dự án
                    </button>
                    <button 
                        onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedIds(new Set()); }}
                        className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${isMultiSelectMode ? 'bg-primary text-white' : 'bg-white/5 text-text-muted hover:text-white'}`}
                    >
                        {isMultiSelectMode ? 'HUỶ CHỌN' : 'ĐA NHIỆM'}
                    </button>
                </div>

                <div className="space-y-2">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 !text-sm">search</span>
                        <input className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-primary/50" placeholder="Tìm chương..." value={chapterFilter} onChange={e => setChapterFilter(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredChapters.map(c => (
                    <div 
                        key={c.id} 
                        onClick={() => isMultiSelectMode ? toggleSelect(c.id) : setActiveChapterId(c.id)} 
                        className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center gap-3 ${activeChapterId === c.id ? 'bg-primary/10 border-primary/20' : 'hover:bg-white/5 border-transparent'}`}
                    >
                        {isMultiSelectMode && (
                            <div className={`size-4 rounded border flex items-center justify-center transition-all ${selectedIds.has(c.id) ? 'bg-primary border-primary' : 'border-white/20 bg-black/20'}`}>
                                {selectedIds.has(c.id) && <span className="material-symbols-outlined !text-[10px] text-white">check</span>}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] font-bold text-white/20 uppercase">Ch. {c.index}</span>
                                <div className={`px-1 rounded text-[8px] font-bold uppercase ${c.status === 'raw' ? 'bg-white/5 text-white/20' : 'bg-success/10 text-success'}`}>{c.status}</div>
                            </div>
                            <div className="text-xs font-bold truncate text-white/80">{c.titleTranslated || c.titleOriginal}</div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>

        {/* EDITOR MAIN */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0f0b1a] relative">
            <header className="h-16 border-b border-white/5 bg-bg-panel/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-text-muted">
                        <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-white tracking-tight">{activeChapter?.titleOriginal || "Đang tải..."}</h2>
                            <span className="text-[10px] text-white/20 font-mono">#{activeChapter?.index}</span>
                        </div>
                        {saving && <span className="text-[9px] font-bold text-success animate-pulse uppercase">Auto-saving...</span>}
                    </div>
                </div>
                
                {/* View Mode Switcher */}
                <div className="hidden md:flex bg-black/20 p-1 rounded-lg">
                    {[
                        { id: 'RAW', icon: 'description', label: 'GỐC' },
                        { id: 'PARALLEL', icon: 'splitscreen', label: 'SONG SONG' },
                        { id: 'TRANSLATE', icon: 'translate', label: 'DỊCH' }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setEditorMode(mode.id as EditorMode)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${editorMode === mode.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined !text-sm">{mode.icon}</span>
                            <span>{mode.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleScanConsistency}
                        className="h-9 px-4 rounded-lg border border-white/10 text-white/60 text-[10px] font-bold flex items-center gap-2 hover:bg-white/5 transition-all"
                    >
                        <span className="material-symbols-outlined !text-sm">analytics</span> QUÉT NHẤT QUÁN
                    </button>
                    <button 
                        onClick={handleRuleTranslateFullChapter}
                        className="h-9 px-4 rounded-lg bg-warning/10 border border-warning/30 text-warning text-[10px] font-bold flex items-center gap-2 hover:bg-warning hover:text-black transition-all"
                    >
                        <span className="material-symbols-outlined !text-sm">bolt</span> DỊCH QTRANSLATE
                    </button>
                    <button 
                        onClick={async () => {
                            if (!activeChapter || isTranslatingChapter) return;
                            setIsTranslatingChapter(true);
                            try {
                                const res = await translateChapter(activeChapter, project, glossaryTerms);
                                handleUpdateContent({ titleTranslated: res.title, contentTranslated: res.content, status: 'translated' });
                            } catch (e) { alert("Lỗi dịch AI"); }
                            finally { setIsTranslatingChapter(false); }
                        }}
                        className="h-9 px-4 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center gap-2"
                    >
                        {isTranslatingChapter ? <span className="material-symbols-outlined animate-spin !text-sm">sync</span> : <span className="material-symbols-outlined !text-sm">auto_awesome</span>} DỊCH AI
                    </button>
                </div>
            </header>

            <div className={`flex-1 grid ${editorMode === 'PARALLEL' ? 'grid-cols-2 divide-x divide-white/5' : 'grid-cols-1'} overflow-hidden`}>
                <div className={`flex flex-col h-full p-8 overflow-hidden bg-bg-main relative ${editorMode === 'TRANSLATE' ? 'hidden' : ''}`}>
                    <textarea 
                        ref={rawTextareaRef}
                        className="flex-1 bg-transparent border-none resize-none focus:ring-0 text-white/40 font-mono text-base leading-relaxed p-0 custom-scrollbar selection:bg-primary/30 overflow-y-auto"
                        placeholder="Dán nội dung gốc..."
                        value={activeChapter?.contentRaw || ""}
                        onMouseUp={handleRawSelect}
                        onKeyUp={handleRawSelect}
                        onScroll={() => handleScroll('raw')}
                        onChange={e => handleUpdateContent({ contentRaw: e.target.value })}
                    />
                </div>
                <div className={`flex flex-col h-full p-8 overflow-hidden bg-bg-panel/30 relative ${editorMode === 'RAW' ? 'hidden' : ''}`}>
                    <textarea 
                        ref={translatedTextareaRef}
                        className="flex-1 bg-transparent border-none resize-none focus:ring-0 text-white text-[1.1rem] leading-[1.8] font-editor p-0 custom-scrollbar selection:bg-primary/40 overflow-y-auto"
                        placeholder="Nội dung dịch..."
                        value={activeChapter?.contentTranslated || ""}
                        onScroll={() => handleScroll('translated')}
                        onChange={e => handleUpdateContent({ contentTranslated: e.target.value })}
                    />
                </div>
            </div>

            {/* QTRANSLATE QUICK OVERLAY NÂNG CẤP DỮ LIỆU */}
            {qtSelection && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-bg-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                    <div className="px-6 py-3 bg-black/40 border-b border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase text-warning tracking-widest flex items-center gap-2">
                             <span className="material-symbols-outlined !text-sm">translate</span> QUICK RULE LOOKUP
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => setQtSelection(null)} className="text-white/20 hover:text-white p-1"><span className="material-symbols-outlined !text-sm">close</span></button>
                        </div>
                    </div>
                    <div className="p-4 flex gap-4">
                        <div className="flex-[3] flex flex-wrap gap-2 leading-[2.5] bg-black/20 p-4 rounded-xl border border-white/5 max-h-64 overflow-y-auto custom-scrollbar">
                            {qtSelection.tokens.map((token, i) => (
                                <div key={i} className="group/token relative">
                                    <button 
                                        onClick={() => handleQtInsert(token.translated)}
                                        className={`px-2 py-0.5 rounded-lg transition-all text-sm font-bold border ${
                                            token.type === 'glossary' ? 'bg-primary text-white border-primary shadow-lg' :
                                            token.type === 'vietphrase' ? 'text-warning hover:bg-warning/10 border-transparent hover:border-warning/30' :
                                            'text-white/20 border-transparent'
                                        }`}
                                    >
                                        {token.translated}
                                    </button>
                                    
                                    {/* Tooltip hiển thị Thiều Chửu & Lạc Việt */}
                                    {(token.thieuChuu || token.lacViet) && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-bg-main border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover/token:opacity-100 pointer-events-none transition-opacity z-[60]">
                                            <div className="text-[10px] font-bold text-primary uppercase mb-2">Tra cứu sâu: {token.original}</div>
                                            {token.thieuChuu && (
                                                <div className="mb-2">
                                                    <div className="text-[8px] font-black text-warning uppercase">Thiều Chửu:</div>
                                                    <div className="text-[10px] text-white/70 line-clamp-3 leading-relaxed">{token.thieuChuu}</div>
                                                </div>
                                            )}
                                            {token.lacViet && (
                                                <div>
                                                    <div className="text-[8px] font-black text-accent uppercase">Lạc Việt:</div>
                                                    <div className="text-[10px] text-white/70 line-clamp-3 leading-relaxed">{token.lacViet}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
};

export default ChapterEditor;
