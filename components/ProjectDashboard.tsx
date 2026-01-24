import React, { useState, useMemo, useEffect } from 'react';
import { Project, Chapter, ChapterStatus, ProjectStats } from '../types';
import { workflowService } from '../services/mockServices';

interface ProjectDashboardProps {
  project: Project;
  onBack: () => void;
}

type Tab = 'OVERVIEW' | 'CHAPTERS' | 'GLOSSARY' | 'CHARACTERS' | 'RELATIONSHIPS' | 'COLLAB' | 'SETTINGS' | 'EXPORT';
type EditorMode = 'RAW' | 'TRANSLATE' | 'PARALLEL' | 'SINGLE';

// --- UTILS ---

/**
 * Calculates growth delta between current real-time stats and a historical snapshot.
 * Returns 0 if no snapshot exists (never guesses).
 */
const calculateGrowth = (current: number, historical: number | undefined): number => {
    if (historical === undefined) return 0;
    return current - historical;
};

// --- SUB-COMPONENTS ---

// 1. OVERVIEW TAB (State & Sync Management)
const OverviewTab: React.FC<{ 
    project: Project; 
    chapters: Chapter[];
    onUpdateProject: (p: Partial<Project>) => void;
}> = ({ project, chapters, onUpdateProject }) => {
    
    // STRICT AGGREGATION: Derived directly from the 'chapters' array.
    // Source of Truth: chapters[]
    const currentStats: ProjectStats = useMemo(() => {
        const totalChapters = chapters.length;
        const translatedChapters = chapters.filter(c => 
            c.status === 'translated' || c.status === 'approved' || c.status === 'published'
        ).length;
        
        const completionPercent = totalChapters === 0 ? 0 : Math.round((translatedChapters / totalChapters) * 100);
        
        // Note: Glossary/Characters would be aggregated from their respective arrays in a real app.
        // Using project.stats for these specific metrics as placeholders if arrays aren't passed.
        
        return {
            totalChapters,
            translatedChapters,
            completionPercent,
            glossaryTerms: project.stats.glossaryTerms, // Placeholder
            characters: project.stats.characters // Placeholder
        };
    }, [chapters, project.stats.glossaryTerms, project.stats.characters]);

    // SNAPSHOT COMPARISON: Calculate deltas
    const growth = useMemo(() => ({
        total: calculateGrowth(currentStats.totalChapters, project.yesterdayStats?.totalChapters),
        translated: calculateGrowth(currentStats.translatedChapters, project.yesterdayStats?.translatedChapters)
    }), [currentStats, project.yesterdayStats]);

    // Workflow: Sync Action
    const [isSyncing, setIsSyncing] = useState(false);
    
    const handleSyncPush = async () => {
        setIsSyncing(true);
        onUpdateProject({ syncStatus: 'syncing' });
        
        const result = await workflowService.pushToCloud(project);
        
        onUpdateProject({ 
            syncStatus: result.status, 
            lastSyncAt: result.timestamp 
        });
        setIsSyncing(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 animate-in fade-in duration-300">
            
            {/* LEFT COLUMN: STATS & COVER */}
            <div className="flex flex-col gap-6">
                
                {/* Derived Stats Panel */}
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary !text-lg">analytics</span> Project Stats
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Total Chapters</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{currentStats.totalChapters}</span>
                                {growth.total !== 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 rounded ${growth.total > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {growth.total > 0 ? '+' : ''}{growth.total}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Translated</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-success">{currentStats.translatedChapters}</span>
                                {growth.translated !== 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 rounded ${growth.translated > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {growth.translated > 0 ? '+' : ''}{growth.translated}
                                    </span>
                                )}
                            </div>
                        </div>
                         <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                             <div className="h-full bg-gradient-to-r from-success to-primary" style={{ width: `${currentStats.completionPercent}%` }}></div>
                        </div>
                        <div className="h-px bg-white/5 my-2"></div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Glossary Terms</span>
                            <span className="font-bold text-accent">{currentStats.glossaryTerms}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Characters</span>
                            <span className="font-bold text-white">{currentStats.characters}</span>
                        </div>
                    </div>
                </div>

                {/* Cover Panel */}
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-5 shadow-xl">
                     <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Cover Image</h3>
                     <div className="aspect-[2/3] bg-black/20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-white/30 transition-colors">
                         {project.coverImage ? (
                             <img src={project.coverImage} alt="Cover" className="w-full h-full object-cover" />
                         ) : (
                             <div className="text-center">
                                 <span className="material-symbols-outlined !text-4xl text-white/20 mb-2">image</span>
                                 <p className="text-[10px] text-white/40 uppercase font-bold">Upload</p>
                             </div>
                         )}
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <span className="material-symbols-outlined text-white">upload</span>
                         </div>
                     </div>
                </div>
            </div>

            {/* RIGHT COLUMN: METADATA & SYNC */}
            <div className="flex flex-col gap-6">
                
                {/* Metadata Editor (Optimistic Updates) */}
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-8 shadow-xl">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Project Title</label>
                            <input 
                                value={project.title} 
                                onChange={(e) => onUpdateProject({ title: e.target.value })}
                                className="bg-transparent w-full text-2xl font-black font-display text-white focus:outline-none border-b border-transparent focus:border-primary transition-colors placeholder:text-white/20"
                                placeholder="Enter title..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Author</label>
                                <input 
                                    value={project.author} 
                                    onChange={(e) => onUpdateProject({ author: e.target.value })}
                                    className="bg-white/5 w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 border border-transparent focus:border-primary/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Genres</label>
                                <div className="flex flex-wrap gap-2">
                                    {project.genres.map(g => (
                                        <span key={g} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold">{g}</span>
                                    ))}
                                    <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-muted rounded-lg text-xs font-bold border border-white/5 transition-colors">
                                        + Add
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Synopsis</label>
                            <textarea 
                                value={project.description || ""}
                                onChange={(e) => onUpdateProject({ description: e.target.value })}
                                className="w-full bg-white/5 rounded-xl p-4 text-sm text-white/80 focus:outline-none focus:bg-white/10 border border-transparent focus:border-primary/50 transition-colors min-h-[120px] resize-none leading-relaxed"
                                placeholder="Write a description..."
                            />
                        </div>
                    </div>
                </div>

                {/* Cloud Sync Core Panel */}
                <div className="bg-gradient-to-br from-bg-panel to-[#2e1065] border border-primary/20 rounded-2xl p-8 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity duration-700">
                         <span className="material-symbols-outlined !text-[12rem]">cloud_sync</span>
                    </div>
                    
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined">sync_alt</span> Sync & Publish
                    </h3>
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border flex items-center gap-2 ${
                            project.syncStatus === 'synced' ? 'bg-success/20 text-success border-success/20' : 
                            project.syncStatus === 'dirty' ? 'bg-warning/20 text-warning border-warning/20' :
                            'bg-white/5 text-text-muted border-white/10'
                        }`}>
                            <span className={`size-2 rounded-full ${project.syncStatus === 'synced' ? 'bg-success' : project.syncStatus === 'dirty' ? 'bg-warning' : 'bg-gray-500'}`}></span>
                            {project.syncStatus === 'synced' ? 'All Synced' : project.syncStatus === 'dirty' ? 'Unsaved Changes' : 'Offline'}
                        </div>
                        <span className="text-xs text-text-muted font-mono">Last synced: {project.lastSyncAt ? new Date(project.lastSyncAt).toLocaleTimeString() : 'Never'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            disabled={isSyncing}
                            className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined !text-lg">cloud_download</span> Pull Cloud
                        </button>
                        <button 
                            onClick={handleSyncPush}
                            disabled={isSyncing}
                            className={`py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isSyncing ? (
                                <span className="material-symbols-outlined !text-lg animate-spin">refresh</span>
                            ) : (
                                <span className="material-symbols-outlined !text-lg">cloud_upload</span>
                            )}
                            {isSyncing ? 'Syncing...' : 'Push Changes'}
                        </button>
                    </div>
                </div>

                {/* Permissions Toggles */}
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-6 shadow-xl">
                     <div className="space-y-4">
                        {[
                            { key: 'allowPublicView', label: 'Public Access' },
                            { key: 'showOnBulletin', label: 'Show on Activity Feed' },
                            { key: 'requireApproval', label: 'Require Moderator Approval' },
                            { key: 'allowEpubExport', label: 'Allow EPUB Download' },
                            { key: 'allowContribution', label: 'Enable Community Contributions' },
                        ].map((item) => (
                             <div key={item.key} className="flex items-center justify-between group">
                                 <span className="text-sm font-medium text-text-muted group-hover:text-white transition-colors">{item.label}</span>
                                 <button 
                                     onClick={() => onUpdateProject({ 
                                        settings: { 
                                            ...project.settings, 
                                            [item.key]: !project.settings[item.key as keyof typeof project.settings] 
                                        } 
                                     })}
                                     className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
                                         project.settings[item.key as keyof typeof project.settings] ? 'bg-primary' : 'bg-white/10'
                                     }`}
                                 >
                                     <div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${
                                         project.settings[item.key as keyof typeof project.settings] ? 'translate-x-5' : 'translate-x-0'
                                     }`}></div>
                                 </button>
                             </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};

// 2. CHAPTERS TAB (Bulk Actions & Editor)
const ChaptersTab: React.FC<{
    chapters: Chapter[];
    onUpdateChapters: (newChapters: Chapter[]) => void;
}> = ({ chapters, onUpdateChapters }) => {
    
    // UI State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'RAW' | 'DRAFT' | 'TRANSLATED' | 'PUBLISHED'>('ALL');
    
    // EDITOR STATE
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
    const [editorMode, setEditorMode] = useState<EditorMode>('PARALLEL');
    const [tempRaw, setTempRaw] = useState('');
    const [tempTrans, setTempTrans] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    
    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize Editor Logic
    const openEditor = (chapter: Chapter) => {
        setEditingChapterId(chapter.id);
        setTempRaw(chapter.contentRaw || '');
        setTempTrans(chapter.contentTranslated || '');
        // Default to PARALLEL for translators, or RAW if empty
        setEditorMode(chapter.contentTranslated ? 'PARALLEL' : 'RAW');
    };

    const saveEditor = () => {
        if (!editingChapterId) return;
        onUpdateChapters(chapters.map(c => 
            c.id === editingChapterId 
            ? { ...c, contentRaw: tempRaw, contentTranslated: tempTrans, status: 'translated', isDirty: true, updatedAt: new Date().toISOString() } 
            : c
        ));
        setEditingChapterId(null);
    };

    // Filter Logic
    const filteredChapters = useMemo(() => {
        let result = chapters;
        
        // 1. Filter by Status
        if (statusFilter !== 'ALL') {
            result = result.filter(c => c.status.toUpperCase() === statusFilter);
        }
        
        // 2. Filter by Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(c => 
                c.titleTranslated.toLowerCase().includes(lowerQuery) || 
                c.titleOriginal.toLowerCase().includes(lowerQuery) ||
                c.index.toString().includes(lowerQuery)
            );
        }
        
        return result;
    }, [chapters, statusFilter, searchQuery]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredChapters.length / itemsPerPage);
    const paginatedChapters = filteredChapters.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchQuery]);

    // Action Handlers
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedChapters.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(paginatedChapters.map(c => c.id)));
    };

    const handleCreateChapter = () => {
        const newIndex = chapters.length > 0 ? Math.max(...chapters.map(c => c.index)) + 1 : 1;
        const newChapter: Chapter = {
            id: `new-${Date.now()}`,
            projectId: chapters[0]?.projectId || 'new',
            index: newIndex,
            titleOriginal: `New Chapter ${newIndex}`,
            titleTranslated: '',
            contentRaw: '',
            contentTranslated: '',
            status: 'raw',
            isDirty: true,
            version: 1,
            wordCount: 0,
            updatedAt: new Date().toISOString()
        };
        onUpdateChapters([...chapters, newChapter]);
        openEditor(newChapter);
    };

    const handleBulkAction = async (action: 'TRANSLATE' | 'PUBLISH' | 'DELETE') => {
        setIsProcessing(true);
        const idsToProcess: string[] = Array.from(selectedIds);

        if (action === 'DELETE') {
            onUpdateChapters(chapters.filter(c => !selectedIds.has(c.id)));
        } 
        else if (action === 'TRANSLATE') {
            // Workflow: Call service -> Update Status -> Mark Dirty
            await workflowService.translateChapters(idsToProcess);
            onUpdateChapters(chapters.map(c => selectedIds.has(c.id) ? { ...c, status: 'translated', isDirty: true } : c));
        }
        else if (action === 'PUBLISH') {
            // Workflow: Only 'translated' chapters can be published
            await workflowService.publishChapters(idsToProcess);
            onUpdateChapters(chapters.map(c => {
                if (selectedIds.has(c.id) && (c.status === 'translated' || c.status === 'approved')) {
                    return { ...c, status: 'published', isDirty: true };
                }
                return c;
            }));
        }

        setSelectedIds(new Set());
        setIsProcessing(false);
    };

    const activeChapter = chapters.find(c => c.id === editingChapterId);

    return (
        <div className="bg-bg-panel border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-200px)] relative">
            
            {/* --- WORKSPACE EDITOR MODAL --- */}
            {editingChapterId && activeChapter && (
                <div className="absolute inset-0 z-50 bg-bg-main/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in zoom-in-95 duration-200">
                    <div className="w-full max-w-7xl h-full bg-bg-panel border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
                        
                        {/* 1. EDITOR HEADER */}
                        <div className="h-16 px-6 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-white flex items-center gap-3 text-lg">
                                    <span className="material-symbols-outlined text-primary">edit_document</span>
                                    {activeChapter.index}. {activeChapter.titleTranslated || activeChapter.titleOriginal}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    activeChapter.status === 'published' ? 'bg-purple-500/20 text-purple-400 border-purple-500/20' :
                                    activeChapter.status === 'translated' ? 'bg-success/20 text-success border-success/20' : 
                                    'bg-white/10 text-text-muted border-white/10'
                                }`}>
                                    {activeChapter.status}
                                </span>
                            </div>

                            {/* MODE SWITCHER */}
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                {[
                                    { id: 'RAW', label: 'Edit Raw', icon: 'raw_on' },
                                    { id: 'TRANSLATE', label: 'Dịch', icon: 'translate' },
                                    { id: 'PARALLEL', label: 'Song song', icon: 'splitscreen' },
                                    { id: 'SINGLE', label: 'Đơn', icon: 'article' },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setEditorMode(mode.id as EditorMode)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                            editorMode === mode.id 
                                            ? 'bg-primary text-white shadow-lg' 
                                            : 'text-text-muted hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined !text-sm">{mode.icon}</span>
                                        {mode.label}
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setEditingChapterId(null)} className="p-2 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* 2. EDITOR BODY */}
                        <div className="flex-1 flex overflow-hidden relative bg-[#130e20]">
                            
                            {/* MODE: EDIT RAW (Full Source Editor) */}
                            {editorMode === 'RAW' && (
                                <div className="w-full h-full flex flex-col p-8 max-w-4xl mx-auto">
                                    <h4 className="text-xs font-bold text-text-muted uppercase mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined !text-sm">raw_on</span> Source Text (Editable)
                                    </h4>
                                    <textarea 
                                        value={tempRaw}
                                        onChange={(e) => setTempRaw(e.target.value)}
                                        className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl p-6 resize-none focus:outline-none focus:border-primary/50 text-white/90 font-mono text-sm leading-relaxed custom-scrollbar placeholder:text-white/20"
                                        placeholder="Paste raw text here..."
                                    />
                                </div>
                            )}

                            {/* MODE: TRANSLATE (Focus Mode) */}
                            {editorMode === 'TRANSLATE' && (
                                <div className="w-full h-full flex flex-col p-8 max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-primary uppercase flex items-center gap-2">
                                            <span className="material-symbols-outlined !text-sm">translate</span> Translation Target
                                        </h4>
                                        <div className="text-[10px] font-bold text-text-muted bg-white/5 px-2 py-1 rounded border border-white/5">
                                            AI Assistant Active
                                        </div>
                                    </div>
                                    <textarea 
                                        value={tempTrans}
                                        onChange={(e) => setTempTrans(e.target.value)}
                                        className="flex-1 w-full bg-transparent border-none p-0 resize-none focus:outline-none text-white font-serif text-lg leading-loose custom-scrollbar placeholder:text-white/20"
                                        placeholder="Start translating..."
                                    />
                                </div>
                            )}

                            {/* MODE: PARALLEL (Side-by-Side) */}
                            {editorMode === 'PARALLEL' && (
                                <div className="w-full h-full grid grid-cols-2 divide-x divide-white/5">
                                    {/* Left: Source (Read Only Reference) */}
                                    <div className="flex flex-col p-6 bg-black/10 overflow-hidden">
                                        <h4 className="text-xs font-bold text-text-muted uppercase mb-4 sticky top-0 bg-transparent shrink-0">Source Reference</h4>
                                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                                            <p className="text-white/60 font-serif leading-loose whitespace-pre-wrap text-sm">
                                                {tempRaw || <span className="italic opacity-50">[No source text]</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Right: Target (Editable) */}
                                    <div className="flex flex-col p-6 overflow-hidden">
                                        <h4 className="text-xs font-bold text-primary uppercase mb-4 shrink-0">Translation</h4>
                                        <textarea 
                                            value={tempTrans}
                                            onChange={(e) => setTempTrans(e.target.value)}
                                            className="flex-1 w-full bg-transparent resize-none focus:outline-none text-white/90 font-serif leading-loose placeholder:text-white/20 custom-scrollbar"
                                            placeholder="Translate here..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* MODE: SINGLE (Read-Focused) */}
                            {editorMode === 'SINGLE' && (
                                <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#1a1528]">
                                    <div className="max-w-3xl mx-auto py-12 px-8">
                                        <h1 className="text-3xl font-black text-white mb-8 font-display text-center">
                                            {activeChapter.titleTranslated}
                                        </h1>
                                        <div className="prose prose-invert prose-lg max-w-none font-serif leading-loose text-white/90 whitespace-pre-wrap">
                                            {tempTrans || <span className="text-text-muted italic">[No translation content]</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* 3. FOOTER */}
                        <div className="h-14 border-t border-white/10 bg-black/20 flex justify-between items-center px-6 shrink-0">
                            <div className="text-xs font-mono text-text-muted">
                                Words: <span className="text-white">{tempTrans.split(/\s+/).filter(w => w.length > 0).length}</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingChapterId(null)} className="px-4 py-2 text-sm font-bold text-text-muted hover:text-white transition-colors">Cancel</button>
                                <button onClick={saveEditor} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                                    Save & Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Chapter Toolbar */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex flex-wrap items-center justify-between gap-4">
                
                {/* Left: Search & Filter */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted !text-lg">search</span>
                        <input 
                            type="text" 
                            placeholder="Search chapters..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 w-64 transition-colors placeholder:text-white/20"
                        />
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        {['ALL', 'RAW', 'TRANSLATED', 'PUBLISHED'].map(f => (
                            <button 
                                key={f}
                                onClick={() => setStatusFilter(f as any)}
                                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors uppercase ${
                                    statusFilter === f ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                     {/* TOOLBAR ADDITIONS: Upload, Web Import, Consistency Check */}
                     <button className="size-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors" title="Upload File">
                        <span className="material-symbols-outlined !text-lg">upload_file</span>
                     </button>
                     <button className="size-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors" title="Import from Web">
                        <span className="material-symbols-outlined !text-lg">link</span>
                     </button>
                     <button className="size-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors" title="Consistency Check">
                        <span className="material-symbols-outlined !text-lg">rule</span>
                     </button>
                     <div className="h-6 w-px bg-white/10 mx-1"></div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 fade-in duration-200 mr-2">
                             <div className="text-[10px] font-bold text-white/40 uppercase mr-1">{selectedIds.size} Selected</div>
                             
                             <button 
                                onClick={() => handleBulkAction('TRANSLATE')} 
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5 flex items-center gap-1 disabled:opacity-50"
                             >
                                <span className="material-symbols-outlined !text-sm">translate</span> Translate
                             </button>
                             
                             <button 
                                onClick={() => handleBulkAction('PUBLISH')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-xs font-bold bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors border border-accent/20 flex items-center gap-1 disabled:opacity-50"
                             >
                                <span className="material-symbols-outlined !text-sm">publish</span> Publish
                             </button>
                             
                             <button 
                                onClick={() => handleBulkAction('DELETE')}
                                disabled={isProcessing} 
                                className="px-3 py-1.5 text-xs font-bold bg-danger/10 hover:bg-danger/20 text-danger rounded-lg transition-colors border border-danger/20 flex items-center gap-1 disabled:opacity-50"
                             >
                                <span className="material-symbols-outlined !text-sm">delete</span>
                             </button>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleCreateChapter}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-base">add</span>
                        New Chapter
                    </button>
                </div>
            </div>

            {/* 3. Chapter Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#130e20]/90 sticky top-0 backdrop-blur-md z-10 text-[10px] uppercase text-text-muted font-bold tracking-wider shadow-sm">
                        <tr>
                            <th className="p-4 w-14 text-center border-b border-white/5">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.size === paginatedChapters.length && paginatedChapters.length > 0} 
                                    onChange={toggleSelectAll} 
                                    className="rounded bg-white/10 border-white/20 size-4 checked:bg-primary checked:border-primary cursor-pointer transition-colors focus:ring-0 focus:ring-offset-0" 
                                />
                            </th>
                            <th className="p-4 w-20 border-b border-white/5"># Index</th>
                            <th className="p-4 border-b border-white/5">Title (Original / Translated)</th>
                            <th className="p-4 w-32 border-b border-white/5">Status</th>
                            <th className="p-4 w-24 border-b border-white/5 text-right">Words</th>
                            <th className="p-4 w-20 border-b border-white/5 text-center">Cmt</th>
                            <th className="p-4 w-24 border-b border-white/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {paginatedChapters.length > 0 ? (
                            paginatedChapters.map(ch => (
                                <tr 
                                    key={ch.id} 
                                    className={`group hover:bg-white/5 transition-colors cursor-pointer ${selectedIds.has(ch.id) ? 'bg-primary/5' : ''}`}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                                        openEditor(ch);
                                    }}
                                >
                                    <td className="p-4 text-center">
                                        <input type="checkbox" checked={selectedIds.has(ch.id)} onChange={() => toggleSelect(ch.id)} className="rounded bg-white/10 border-white/20 size-4 checked:bg-primary checked:border-primary cursor-pointer transition-colors focus:ring-0 focus:ring-offset-0" />
                                    </td>
                                    <td className="p-4 text-text-muted font-mono opacity-70">#{ch.index.toString().padStart(3, '0')}</td>
                                    <td className="p-4">
                                        <div className="text-white font-bold mb-1 group-hover:text-primary transition-colors">{ch.titleTranslated || <span className="text-text-muted italic font-normal">Untitled Chapter</span>}</div>
                                        <div className="text-xs text-text-muted opacity-50 font-serif">{ch.titleOriginal}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                            ch.status === 'published' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            ch.status === 'translated' || ch.status === 'approved' ? 'bg-success/10 text-success border-success/20' : 
                                            ch.status === 'draft' ? 'bg-warning/10 text-warning border-warning/20' : 
                                            'bg-white/5 text-text-muted border-white/10'
                                        }`}>
                                            <span className={`size-1.5 rounded-full ${
                                                ch.status === 'published' ? 'bg-purple-400' :
                                                ch.status === 'translated' || ch.status === 'approved' ? 'bg-success' : 
                                                ch.status === 'draft' ? 'bg-warning' : 'bg-gray-500'
                                            }`}></span>
                                            {ch.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-text-muted font-mono text-xs">{ch.wordCount.toLocaleString()}</td>
                                    <td className="p-4 text-center text-text-muted text-xs font-mono">{ch.commentsCount || '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openEditor(ch); }}
                                                className="size-8 rounded-lg flex items-center justify-center hover:bg-primary/20 hover:text-primary text-text-muted transition-colors" 
                                                title="Open Editor"
                                            >
                                                <span className="material-symbols-outlined !text-lg">edit_note</span>
                                            </button>
                                            <button className="size-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white text-text-muted transition-colors">
                                                <span className="material-symbols-outlined !text-lg">more_vert</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-text-muted italic">
                                    No chapters found matching your filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 4. Pagination */}
            <div className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between text-xs font-bold text-text-muted">
                <div>
                    Showing {paginatedChapters.length} of {filteredChapters.length} chapters
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>
                    <div className="px-2">Page {currentPage} of {totalPages || 1}</div>
                    <button 
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN LAYOUT ---

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ project: initialProject, onBack }) => {
    // Top-Level State for the Workflow Engine
    const [project, setProject] = useState(initialProject);
    const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
    
    // STRICT DATA RULE: Initialize as empty. Do not auto-generate mock data on init.
    // Use an effect to load data if needed, but default must be clean.
    const [chapters, setChapters] = useState<Chapter[]>([]);

    // Simulation Effect: In a real app, this fetches from DB. 
    // Here, we simulate data loading ONLY for the "demo" projects (id starts with cloud-1) 
    // to preserve the user experience, while keeping new projects (local-*) empty.
    useEffect(() => {
        if (project.id === 'cloud-1' && chapters.length === 0) {
            // Simulate fetch for demo project
            setChapters(Array.from({ length: 40 }).map((_, i) => ({
                id: `ch-${i}`,
                projectId: project.id,
                index: i + 1,
                titleOriginal: `제${i+1}장: 운명의 시작`,
                titleTranslated: i < 15 ? `Chapter ${i+1}: The Beginning of Fate` : '',
                contentRaw: 'Deep in the mountains, a young boy trained with his sword...',
                contentTranslated: i < 15 ? 'Deep in the mountains, a young boy trained with his sword...' : '',
                status: i < 15 ? 'translated' : i < 25 ? 'draft' : 'raw',
                isDirty: false,
                version: 1,
                wordCount: 1500 + (i*10),
                commentsCount: Math.floor(Math.random() * 5),
                updatedAt: new Date().toISOString()
            })));
        }
    }, [project.id]);

    // Update Logic: Marks project as Dirty for Sync
    const updateProject = (patch: Partial<Project>) => {
        setProject(prev => ({ ...prev, ...patch, syncStatus: 'dirty' }));
    };

    const updateChapters = (newChapters: Chapter[]) => {
        setChapters(newChapters);
        // Also mark project as dirty when chapters change
        setProject(prev => ({ ...prev, syncStatus: 'dirty' }));
    };

    return (
        <div className="min-h-screen bg-[#130e20] text-white font-sans flex flex-col">
            
            {/* 1. TOP BAR */}
            <header className="h-16 border-b border-white/5 bg-[#130e20]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/5">
                        <span className="material-symbols-outlined !text-lg">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-sm font-bold text-white flex items-center gap-2">
                            {project.title}
                            {project.syncStatus === 'dirty' && <span className="size-2 rounded-full bg-warning" title="Unsaved changes"></span>}
                        </h1>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{project.genres[0] || 'Novel'} • {chapters.length} Chapters</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Cloud Usage Bar (Visual only for now) */}
                    <div className="hidden md:block text-right">
                        <div className="text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Cloud Usage 33%</div>
                        <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-[33%] bg-gradient-to-r from-cyan-400 to-purple-500"></div>
                        </div>
                    </div>

                    <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-bold text-white transition-colors">
                        Archive
                    </button>
                    
                    <button className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent rounded-lg text-xs font-bold text-white shadow-lg shadow-primary/20 transition-transform active:scale-95">
                        Upgrade
                    </button>

                    <div className="size-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs border-2 border-[#130e20] outline outline-2 outline-white/10 ring-2 ring-purple-500/20">N</div>
                </div>
            </header>

            {/* 2. TABS */}
            <nav className="flex items-center gap-1 px-6 border-b border-white/5 overflow-x-auto bg-[#130e20]">
                {[
                    { id: 'OVERVIEW', label: 'Overview' },
                    { id: 'CHAPTERS', label: 'Chapters' },
                    { id: 'GLOSSARY', label: 'Glossary' },
                    { id: 'CHARACTERS', label: 'Characters' },
                    { id: 'RELATIONSHIPS', label: 'Relations' },
                    { id: 'COLLAB', label: 'Collab' },
                    { id: 'SETTINGS', label: 'Settings' },
                    { id: 'EXPORT', label: 'Export' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'border-primary text-white' 
                            : 'border-transparent text-white/40 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* 3. CONTENT AREA */}
            <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto animate-in fade-in">
                {activeTab === 'OVERVIEW' && <OverviewTab project={project} chapters={chapters} onUpdateProject={updateProject} />}
                {activeTab === 'CHAPTERS' && <ChaptersTab chapters={chapters} onUpdateChapters={updateChapters} />}
                
                {/* Placeholders for future expansion */}
                {['GLOSSARY', 'CHARACTERS', 'RELATIONSHIPS', 'COLLAB', 'SETTINGS', 'EXPORT'].includes(activeTab) && (
                     <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 bg-bg-panel border border-white/5 rounded-2xl border-dashed">
                        <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined !text-4xl text-white/20">
                                {activeTab === 'GLOSSARY' ? 'menu_book' : 
                                 activeTab === 'CHARACTERS' ? 'person' : 
                                 activeTab === 'EXPORT' ? 'download' : 'construction'}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{activeTab} Module</h3>
                        <p className="text-text-muted max-w-sm">This module is part of the Pro Plan features.</p>
                        <button className="mt-8 px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-full transition-colors border border-white/10">
                            Upgrade to Access
                        </button>
                    </div>
                )}
            </main>

        </div>
    );
};

export default ProjectDashboard;