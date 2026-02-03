
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, Chapter, ProjectStats, GlossaryTerm, ChapterStatus } from '../types';
import { dataService } from '../services/dataService';
import { loadExternalDictionary } from '../services/ruleBasedService';

interface ProjectDashboardProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  onOpenReader: () => void;
}

type Tab = 'OVERVIEW' | 'CHAPTERS' | 'GLOSSARY' | 'SETTINGS' | 'IMPORT_EXPORT';

// --- UTILS ---
const calculateGrowth = (current: number, historical: number | undefined): number => {
    if (historical === undefined) return 0;
    return current - historical;
};

const isLocalId = (id: string) => id.startsWith('local-');

// --- HELPER COMPONENT: EDITABLE FIELD ---
interface EditableFieldProps {
    value: string;
    onSave: (newValue: string) => void;
    label: string;
    type?: 'input' | 'textarea';
    className?: string;
    placeholder?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ value, onSave, label, type = 'input', className = '', placeholder }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const hasCustomSize = className.includes('text-');
    const textSizeClass = hasCustomSize ? '' : 'text-sm';

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue !== value) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        }
        if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">{label}</label>
                {type === 'textarea' ? (
                    <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-black/40 border border-primary/50 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none leading-relaxed ${textSizeClass} ${className}`}
                        rows={4}
                        placeholder={placeholder}
                    />
                ) : (
                    <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-black/40 border border-primary/50 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all ${textSizeClass} ${className}`}
                        placeholder={placeholder}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-1 group cursor-pointer" onClick={() => setIsEditing(true)}>
             <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">{label}</label>
             <div className="relative rounded-xl overflow-hidden">
                <div className={`w-full p-2 border border-transparent rounded-xl transition-colors ${type === 'textarea' ? 'min-h-[80px]' : ''} hover:bg-white/5`}>
                    <p className={`text-white/90 ${type === 'textarea' ? 'leading-relaxed whitespace-pre-wrap' : ''} ${textSizeClass} ${className}`}>
                        {value || <span className="text-white/20 italic">{placeholder || `Nhấp để thêm ${label.toLowerCase()}...`}</span>}
                    </p>
                </div>
                <div className="absolute inset-0 bg-bg-panel/80 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center border border-white/10 rounded-xl pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full shadow-lg transform scale-90 group-hover:scale-110 transition-transform">
                         <span className="material-symbols-outlined text-white !text-lg">edit</span>
                         <span className="text-xs font-bold text-white uppercase">Sửa</span>
                    </div>
                </div>
             </div>
        </div>
    );
};

// 1. OVERVIEW TAB
const OverviewTab: React.FC<{ 
    project: Project; 
    chapters: Chapter[];
    onUpdateProjectPartial: (p: Partial<Project>) => void;
}> = ({ project, chapters, onUpdateProjectPartial }) => {
    
    const [uploadingImg, setUploadingImg] = useState(false);
    const isLocal = isLocalId(project.id);

    const growth = useMemo(() => ({
        total: calculateGrowth(project.stats.totalChapters, project.yesterdayStats?.totalChapters),
        translated: calculateGrowth(project.stats.translatedChapters, project.yesterdayStats?.translatedChapters)
    }), [project.stats, project.yesterdayStats]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAddingGenre, setIsAddingGenre] = useState(false);
    const [tempGenre, setTempGenre] = useState("");
    const genreInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAddingGenre && genreInputRef.current) {
            genreInputRef.current.focus();
        }
    }, [isAddingGenre]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImg(true);

        if (isLocal) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdateProjectPartial({ coverImage: reader.result as string });
                setUploadingImg(false);
            };
            reader.readAsDataURL(file);
        } else {
            const { url, error } = await dataService.uploadCoverImage(file);
            if (error) {
                alert(`Upload failed: ${error}`);
            } else if (url) {
                onUpdateProjectPartial({ coverImage: url });
            }
            setUploadingImg(false);
        }
    };

    const handleGenreSubmit = () => {
        if (tempGenre && tempGenre.trim() !== "") {
            const updatedGenres = [...project.genres, tempGenre.trim()];
            onUpdateProjectPartial({ genres: updatedGenres });
            setTempGenre("");
        }
        setIsAddingGenre(false);
    };

    const handleGenreKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleGenreSubmit();
        } else if (e.key === 'Escape') {
            setIsAddingGenre(false);
            setTempGenre("");
        }
    };

    const handleRemoveGenre = (genreToRemove: string) => {
         const updatedGenres = project.genres.filter(g => g !== genreToRemove);
         onUpdateProjectPartial({ genres: updatedGenres });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 animate-in fade-in duration-300">
            <div className="flex flex-col gap-6">
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary !text-lg">analytics</span> Thống Kê
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Tổng Chương</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{project.stats.totalChapters}</span>
                                {growth.total !== 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 rounded ${growth.total > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {growth.total > 0 ? '+' : ''}{growth.total}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Đã Dịch</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-success">{project.stats.translatedChapters}</span>
                                {growth.translated !== 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 rounded ${growth.translated > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {growth.translated > 0 ? '+' : ''}{growth.translated}
                                    </span>
                                )}
                            </div>
                        </div>
                         <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                             <div className="h-full bg-gradient-to-r from-success to-primary" style={{ width: `${project.stats.completionPercent}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-bg-panel border border-white/5 rounded-2xl p-5 shadow-xl">
                     <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Ảnh Bìa</h3>
                     <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                     />
                     <div 
                        onClick={() => !uploadingImg && fileInputRef.current?.click()}
                        className={`aspect-[2/3] bg-black/20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-white/30 transition-colors ${uploadingImg ? 'opacity-50 cursor-wait' : ''}`}
                     >
                         {uploadingImg ? (
                             <div className="flex flex-col items-center">
                                 <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                                 <span className="text-[10px] mt-2 text-white/50">Đang tải...</span>
                             </div>
                         ) : project.coverImage ? (
                             <>
                                <img src={project.coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <span className="material-symbols-outlined text-white">edit</span>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Đổi Ảnh</span>
                                </div>
                             </>
                         ) : (
                             <div className="text-center group-hover:scale-105 transition-transform">
                                 <span className="material-symbols-outlined !text-4xl text-white/20 mb-2 group-hover:text-primary transition-colors">cloud_upload</span>
                                 <p className="text-[10px] text-white/40 uppercase font-bold group-hover:text-white transition-colors">Tải Ảnh</p>
                             </div>
                         )}
                     </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-8 shadow-xl">
                    <div className="space-y-8">
                        <EditableField 
                             label="Tên Truyện"
                             value={project.title}
                             onSave={(val) => onUpdateProjectPartial({ title: val })}
                             className="text-3xl font-black font-display tracking-tight leading-tight"
                             placeholder="Chưa có tên"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <EditableField 
                                label="Tác Giả"
                                value={project.author}
                                onSave={(val) => onUpdateProjectPartial({ author: val })}
                                placeholder="Chưa rõ"
                            />
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Thể Loại</label>
                                <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
                                    {project.genres.map(g => (
                                        <div key={g} className="group/tag relative">
                                            <span className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold cursor-default">{g}</span>
                                            <button 
                                                onClick={() => handleRemoveGenre(g)}
                                                className="absolute -top-1.5 -right-1.5 size-4 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover/tag:opacity-100 transition-opacity shadow-sm cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined !text-[10px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    {isAddingGenre ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                            <input 
                                                ref={genreInputRef}
                                                value={tempGenre}
                                                onChange={(e) => setTempGenre(e.target.value)}
                                                onBlur={handleGenreSubmit}
                                                onKeyDown={handleGenreKeyDown}
                                                className="w-32 bg-black/40 border border-primary/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-white/30"
                                                placeholder="Tên thể loại..."
                                            />
                                            <button 
                                                onMouseDown={(e) => { e.preventDefault(); handleGenreSubmit(); }}
                                                className="size-7 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary/90"
                                            >
                                                <span className="material-symbols-outlined !text-sm">check</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setIsAddingGenre(true)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded-lg text-xs font-bold border border-white/5 hover:border-white/20 transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined !text-sm">add</span> Thêm
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <EditableField 
                            label="Tóm Tắt"
                            value={project.description || ""}
                            onSave={(val) => onUpdateProjectPartial({ description: val })}
                            type="textarea"
                            placeholder="Thêm tóm tắt nội dung..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. SETTINGS TAB
const SettingsTab: React.FC<{
    project: Project;
    onUpdateProjectPartial: (updates: Partial<Project>) => Promise<void>;
    onOpenReader: () => void;
}> = ({ project, onUpdateProjectPartial, onOpenReader }) => {
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const toggle = async (key: keyof Project['settings']) => {
        setSavingKey(key);
        const newValue = !project.settings[key];
        
        // Construct updates with explicit IS_PUBLIC sync
        const newSettings = { ...project.settings, [key]: newValue };
        const updates: Partial<Project> = { settings: newSettings };
        
        // Critical: Update root property for DB column mapping
        if (key === 'allowPublicView') {
            updates.isPublic = newValue;
        }

        try {
            await onUpdateProjectPartial(updates);
        } finally {
            // Small delay to show "Saving" state visually if network is too fast
            setTimeout(() => setSavingKey(null), 500);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-bg-panel border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Cài Đặt Chung</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                            <div>
                                <div className="text-sm font-bold text-white">Công khai Truyện (Public)</div>
                                <div className="text-xs text-text-muted">Cho phép mọi người xem truyện trên Thư viện công cộng.</div>
                            </div>
                            <div className="flex items-center gap-3">
                                {savingKey === 'allowPublicView' && (
                                    <span className="text-[10px] font-bold text-primary animate-pulse uppercase tracking-wider">Đang lưu...</span>
                                )}
                                <button 
                                onClick={() => toggle('allowPublicView')}
                                disabled={savingKey === 'allowPublicView'}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${project.settings.allowPublicView ? 'bg-primary' : 'bg-white/10'} ${savingKey === 'allowPublicView' ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <div className={`size-4 bg-white rounded-full shadow-md transition-transform ${project.settings.allowPublicView ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                    </div>
                    {/* Other settings can be mapped similarly if needed, keeping simple for now */}
                </div>

                {/* Public Link Section */}
                {project.settings.allowPublicView && (
                    <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined !text-base">public</span> Link Đọc Truyện
                            </h4>
                            <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded">LIVE</span>
                        </div>
                        <p className="text-xs text-text-muted mb-3">Chia sẻ link này để độc giả có thể đọc các chương đã dịch.</p>
                        
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-text-muted font-mono truncate select-all">
                                {window.location.origin}/read/{project.id}
                            </div>
                            <button 
                                onClick={onOpenReader}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <span className="material-symbols-outlined !text-sm">visibility</span> Xem Trước
                            </button>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/read/${project.id}`);
                                    alert('Đã sao chép link!');
                                }}
                                className="p-2 bg-white/5 text-white rounded-lg hover:bg-white/10 border border-white/5"
                                title="Sao chép Link"
                            >
                                <span className="material-symbols-outlined !text-sm">content_copy</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. CHAPTERS TAB
const ChaptersTab: React.FC<{
    onOpenEditor: () => void;
    chapterCount: number;
    translatedCount: number;
}> = ({ onOpenEditor, chapterCount, translatedCount }) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
             <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined !text-4xl">history_edu</span>
             </div>
             <h3 className="text-2xl font-bold text-white mb-2">Quản Lý Chương & Dịch Thuật</h3>
             <p className="text-text-muted mb-8 text-center max-w-md">
                 Bạn đang có {chapterCount} chương ({translatedCount} đã dịch). Sử dụng trình biên tập chuyên nghiệp để thêm, chỉnh sửa và dịch chương mới.
             </p>
             <button 
                onClick={onOpenEditor}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
             >
                <span className="material-symbols-outlined">edit_square</span>
                Mở Trình Biên Tập (Editor)
             </button>
        </div>
    );
};

// 4. GLOSSARY TAB
const GlossaryTab: React.FC<{
    projectId: string;
    glossaryTerms: GlossaryTerm[];
    onUpdateGlossary: (terms: GlossaryTerm[]) => void;
    error?: string | null;
}> = ({ projectId, glossaryTerms, onUpdateGlossary, error }) => {
    const [newTerm, setNewTerm] = useState('');
    const [newDef, setNewDef] = useState('');

    const handleAdd = async () => {
        if (!newTerm.trim() || !newDef.trim()) return;
        const term: GlossaryTerm = {
            id: `local-term-${Date.now()}`,
            projectId,
            term: newTerm,
            definition: newDef
        };
        
        if (!projectId.startsWith('local-')) {
             const res = await dataService.createGlossaryTerm(term);
             if (res.data) term.id = res.data.id;
        }

        onUpdateGlossary([...glossaryTerms, term]);
        setNewTerm('');
        setNewDef('');
    };

    const handleDelete = async (id: string) => {
        if (!projectId.startsWith('local-')) {
            await dataService.deleteGlossaryTerm(id);
        }
        onUpdateGlossary(glossaryTerms.filter(t => t.id !== id));
    };

    if (error && error.includes("glossary_terms")) {
        return (
            <div className="p-6 rounded-2xl bg-bg-panel border border-warning/20 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in">
                <div className="size-12 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-2">
                    <span className="material-symbols-outlined !text-3xl">database</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Chưa tạo bảng thuật ngữ</h3>
                    <p className="text-text-muted text-sm mt-1 max-w-lg">
                        Bảng `glossary_terms` chưa tồn tại trong cơ sở dữ liệu. Vui lòng chạy mã SQL cập nhật để sử dụng tính năng này.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="bg-bg-panel border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Thêm Thuật Ngữ Mới</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Thuật Ngữ (Gốc)</label>
                        <input 
                            value={newTerm}
                            onChange={e => setNewTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary"
                            placeholder="VD: Sung Jin-Woo"
                        />
                    </div>
                    <div className="flex-[2] space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Định Nghĩa / Dịch</label>
                        <input 
                            value={newDef}
                            onChange={e => setNewDef(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary"
                            placeholder="Nhân vật chính, lớp Chiêu Hồn Sư..."
                        />
                    </div>
                    <button onClick={handleAdd} className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90">
                        Thêm
                    </button>
                </div>
             </div>

             <div className="bg-bg-panel border border-white/5 rounded-xl overflow-hidden">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-white/5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                         <tr>
                             <th className="p-4">Thuật Ngữ</th>
                             <th className="p-4">Định Nghĩa</th>
                             <th className="p-4 w-10"></th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                         {glossaryTerms.map(term => (
                             <tr key={term.id} className="hover:bg-white/5 transition-colors group">
                                 <td className="p-4 text-sm font-bold text-white">{term.term}</td>
                                 <td className="p-4 text-sm text-white/70">{term.definition}</td>
                                 <td className="p-4">
                                     <button onClick={() => handleDelete(term.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                         <span className="material-symbols-outlined !text-lg">close</span>
                                     </button>
                                 </td>
                             </tr>
                         ))}
                         {glossaryTerms.length === 0 && (
                             <tr>
                                 <td colSpan={3} className="p-8 text-center text-text-muted text-sm italic">Chưa có thuật ngữ nào.</td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};

// 5. IMPORT/EXPORT TAB (Dictionary/QTranslate)
const ImportExportTab: React.FC<{
    project: Project;
    chapters: Chapter[];
    onUpdateChapters: (chapters: Chapter[]) => void;
}> = ({ project, chapters }) => {
    const handleDictUpload = (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            // PASS TRUE TO PERSIST TO LOCAL STORAGE
            loadExternalDictionary(content, type, true);
            alert(`Đã nạp từ điển ${type} vào bộ lõi QTranslate và lưu vào bộ nhớ trình duyệt!`);
        };
        reader.readAsText(file);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
             {/* Section 1: QTranslate Dictionaries */}
             <div className="bg-bg-panel border border-white/5 rounded-2xl p-6">
                 <div className="size-12 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-4">
                     <span className="material-symbols-outlined !text-2xl">dictionary</span>
                 </div>
                 <h3 className="text-lg font-bold text-white mb-2">Thư Viện QTranslate</h3>
                 <p className="text-sm text-text-muted mb-6">Nạp các tệp từ điển để tối ưu hóa bộ lõi dịch thuật rule-based.</p>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {[
                        { id: 'vietphrase', label: 'VietPhrase.txt' },
                        { id: 'phienam', label: 'PhienAm.txt' },
                        { id: 'thieuChuu', label: 'ThieuChuu.txt' },
                        { id: 'lacViet', label: 'LacViet.txt' },
                        { id: 'luatNhan', label: 'LuatNhan.txt' },
                        { id: 'ignoredList', label: 'IgnoredList.txt' }
                    ].map(dict => (
                        <label key={dict.id} className="flex items-center justify-between p-3 bg-black/20 border border-white/10 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                            <span className="text-xs font-bold text-white/60 group-hover:text-white uppercase">{dict.label}</span>
                            <input type="file" className="hidden" accept=".txt" onChange={(e) => handleDictUpload(e, dict.id)} />
                            <span className="material-symbols-outlined text-white/20 group-hover:text-warning transition-colors">upload</span>
                        </label>
                    ))}
                 </div>
             </div>

             {/* Section 2: Standard Import/Export */}
             <div className="space-y-6">
                <div className="bg-bg-panel border border-white/5 rounded-2xl p-6">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <span className="material-symbols-outlined !text-2xl">file_upload</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Nhập Nội Dung (Chapters)</h3>
                    <p className="text-sm text-text-muted mb-6">Tải lên file .txt để tạo nhiều chương cùng lúc.</p>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer group">
                        <span className="material-symbols-outlined !text-3xl text-white/20 group-hover:text-primary transition-colors mb-2">upload_file</span>
                        <span className="text-xs font-bold text-white/40 group-hover:text-white uppercase">Kéo thả hoặc Nhấp để tải</span>
                    </div>
                </div>

                <div className="bg-bg-panel border border-white/5 rounded-2xl p-6">
                    <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
                        <span className="material-symbols-outlined !text-2xl">file_download</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Xuất Truyện (Export)</h3>
                    <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-xl hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-white/60">book</span>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">EPUB E-Book</div>
                                    <div className="text-xs text-text-muted">Tối ưu cho Kindle, Apple Books</div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-white/20 group-hover:text-white">download</span>
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );
};

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ project: initialProject, onUpdateProject, onBack, onOpenReader }) => {
  const [project, setProject] = useState<Project>(initialProject);
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  const isLocal = isLocalId(project.id);

  useEffect(() => {
    // SYNC STATE ON MOUNT: Ensure UI matches props if props are fresher
    if (initialProject && initialProject.settings) {
         setProject(prev => ({
             ...prev,
             settings: initialProject.settings,
             isPublic: initialProject.isPublic
         }));
    }
  }, [initialProject]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setGlossaryError(null);
      
      if (isLocal) {
        const storedChapters = localStorage.getItem(`chapters-${project.id}`);
        if (storedChapters) setChapters(JSON.parse(storedChapters));
        const storedGlossary = localStorage.getItem(`glossary-${project.id}`);
        if (storedGlossary) setGlossaryTerms(JSON.parse(storedGlossary));
      } else {
        const [chapRes, glossRes] = await Promise.all([
          dataService.fetchChapters(project.id),
          dataService.fetchGlossary(project.id)
        ]);
        if (chapRes.data) setChapters(chapRes.data);
        if (glossRes.data) setGlossaryTerms(glossRes.data);
        if (glossRes.error) setGlossaryError(glossRes.error);
      }
      setLoading(false);
    };
    loadData();
  }, [project.id, isLocal]);

  useEffect(() => {
      if (loading) return;
      const total = chapters.length;
      const translated = chapters.filter(c => ['translated', 'approved', 'published'].includes(c.status)).length;
      const completionPercent = total === 0 ? 0 : Math.round((translated / total) * 100);
      const statsChanged = project.stats.totalChapters !== total || project.stats.translatedChapters !== translated;
      if (statsChanged) {
          const newStats: ProjectStats = { ...project.stats, totalChapters: total, translatedChapters: translated, completionPercent };
          handleUpdateProjectPartial({ stats: newStats });
      }
  }, [chapters]);

  // Robust Update Handler: Updates local state and syncs to DB, handling errors.
  const handleUpdateProjectPartial = async (updates: Partial<Project>) => {
    // 1. Optimistic UI update
    const updatedProject = { ...project, ...updates, updatedAt: new Date().toISOString() };
    setProject(updatedProject);
    onUpdateProject(updatedProject); // Persist to App/Context

    // 2. Sync to Cloud
    if (!isLocal) {
        const { error } = await dataService.updateProject(project.id, updates);
        if (error) {
            console.error("Critical: Failed to save project updates to cloud", error);
        }
    }
  };

  const handleUpdateGlossary = (newTerms: GlossaryTerm[]) => {
    setGlossaryTerms(newTerms);
    if (isLocal) localStorage.setItem(`glossary-${project.id}`, JSON.stringify(newTerms));
  };

  const handleUpdateChapters = (updatedChapters: Chapter[]) => {
      setChapters(updatedChapters);
      if (isLocal) {
          localStorage.setItem(`chapters-${project.id}`, JSON.stringify(updatedChapters));
      }
  };
  
  const tabLabels: Record<Tab, string> = {
      'OVERVIEW': 'Tổng Quan',
      'CHAPTERS': 'Chương & Dịch',
      'GLOSSARY': 'Thuật Ngữ',
      'SETTINGS': 'Cài Đặt',
      'IMPORT_EXPORT': 'Từ Điển & Xuất'
  };

  return (
    <div className="flex flex-col h-screen bg-bg-main text-white">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#130e20]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-white"><span className="material-symbols-outlined">arrow_back</span></button>
          <div><h1 className="font-bold text-lg leading-tight">{project.title}</h1><div className="flex items-center gap-2 text-[10px] text-text-muted font-mono uppercase"><span>{project.sourceLang}</span><span className="material-symbols-outlined !text-[10px]">arrow_forward</span><span>{project.targetLang}</span></div></div>
        </div>
        <nav className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
          {Object.keys(tabLabels).map((tab) => (<button key={tab} onClick={() => setActiveTab(tab as Tab)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white hover:bg-white/5'}`}>{tabLabels[tab as Tab]}</button>))}
        </nav>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (<div className="flex h-full items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>) : (
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'OVERVIEW' && (<OverviewTab project={project} chapters={chapters} onUpdateProjectPartial={handleUpdateProjectPartial} />)}
            {activeTab === 'CHAPTERS' && (
                <ChaptersTab 
                    onOpenEditor={() => {
                        (window as any).triggerOpenEditor?.(project); 
                    }}
                    chapterCount={chapters.length}
                    translatedCount={chapters.filter(c => c.status === 'translated').length}
                />
            )}
            {activeTab === 'GLOSSARY' && (
                <GlossaryTab 
                    projectId={project.id} 
                    glossaryTerms={glossaryTerms} 
                    onUpdateGlossary={handleUpdateGlossary} 
                    error={glossaryError}
                />
            )}
            {activeTab === 'SETTINGS' && (
                <SettingsTab 
                    project={project} 
                    onUpdateProjectPartial={handleUpdateProjectPartial}
                    onOpenReader={onOpenReader}
                />
            )}
            {activeTab === 'IMPORT_EXPORT' && (<ImportExportTab project={project} chapters={chapters} onUpdateChapters={handleUpdateChapters} />)}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectDashboard;
