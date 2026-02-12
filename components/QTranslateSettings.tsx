
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, GlossaryTerm } from '../types';
import { dictionaryManager, loadExternalDictionary } from '../services/ruleBasedService';
import { dataService } from '../services/dataService';

interface QTranslateSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onUpdateProject: (updates: Partial<Project>) => void;
}

type SettingsView = 'MAIN' | 'DICT_NAMES_COMMON' | 'DICT_VP_COMMON' | 'DICT_NAMES_PRIVATE' | 'DICT_VP_PRIVATE';

// Sub-component: Dictionary Editor
const DictionaryEditor = ({ 
    title, 
    sourceType, 
    projectId,
    onBack 
}: { 
    title: string; 
    sourceType: 'common' | 'private';
    projectId?: string;
    onBack: () => void 
}) => {
    const [terms, setTerms] = useState<{key: string, value: string, id?: string}[]>([]);
    const [filter, setFilter] = useState('');
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determines which "common" dict we are editing based on title, for simplicity
    const commonDictType = title.includes('Names') ? 'names' : 'vietphrase';

    useEffect(() => {
        loadTerms();
    }, [sourceType, projectId]);

    const loadTerms = async () => {
        setLoading(true);
        if (sourceType === 'common') {
            const entries = dictionaryManager.getEntries(commonDictType);
            setTerms(entries.map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.key.length - a.key.length)); // Sort by length desc usually better for priority
        } else if (projectId) {
            // "Private" maps to Project Glossary
            const { data } = await dataService.fetchGlossary(projectId);
            setTerms(data.map(g => ({ key: g.term, value: g.definition, id: g.id })));
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newKey || !newValue) return;
        setLoading(true);

        if (sourceType === 'common') {
            dictionaryManager.addEntry(commonDictType, newKey, newValue);
            setTerms(prev => [{ key: newKey, value: newValue }, ...prev]);
        } else if (projectId) {
            const { data } = await dataService.createGlossaryTerm({
                projectId,
                term: newKey,
                definition: newValue
            });
            if (data) {
                setTerms(prev => [{ key: data.term, value: data.definition, id: data.id }, ...prev]);
            }
        }
        setNewKey('');
        setNewValue('');
        setLoading(false);
    };

    const handleDelete = async (item: {key: string, value: string, id?: string}) => {
        if (!confirm(`Xoá "${item.key}"?`)) return;
        setLoading(true);
        if (sourceType === 'common') {
            dictionaryManager.deleteEntry(commonDictType, item.key);
            setTerms(prev => prev.filter(t => t.key !== item.key));
        } else if (item.id) {
            await dataService.deleteGlossaryTerm(item.id);
            setTerms(prev => prev.filter(t => t.id !== item.id));
        }
        setLoading(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (sourceType === 'common') {
                // Load into local memory and localStorage
                loadExternalDictionary(content, commonDictType, true);
                alert(`Đã nạp thành công từ điển ${title}!`);
                await loadTerms();
            } else if (projectId) {
                // Parse and upload to Project Glossary
                const lines = content.split('\n');
                let count = 0;
                // Simple sequential upload (Optimization: Batch insert should be implemented in dataService for large files)
                // For now, limiting to small uploads or handling sequentially to ensure data integrity
                const MAX_BATCH = 500;
                if (lines.length > MAX_BATCH && !confirm(`File có ${lines.length} dòng. Việc tải lên Server có thể mất nhiều thời gian. Tiếp tục?`)) {
                    setLoading(false);
                    return;
                }

                for (const line of lines) {
                    if (!line.trim() || line.startsWith('//')) continue;
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        await dataService.createGlossaryTerm({
                            projectId,
                            term: parts[0].trim(),
                            definition: parts[1].trim()
                        });
                        count++;
                    }
                }
                alert(`Đã thêm ${count} thuật ngữ vào dữ liệu riêng.`);
                await loadTerms();
            }
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const filteredTerms = useMemo(() => {
        const lowerFilter = filter.toLowerCase();
        return terms.filter(t => t.key.toLowerCase().includes(lowerFilter) || t.value.toLowerCase().includes(lowerFilter)).slice(0, 100); // Limit render
    }, [terms, filter]);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] animate-in slide-in-from-right duration-300">
             {/* Sub-Header */}
             <div className="flex items-center justify-between px-4 py-4 border-b border-gray-900 bg-[#0f0f0f]">
                <button onClick={onBack} className="p-2 text-white/70 hover:text-white flex items-center gap-1">
                    <span className="material-symbols-outlined !text-lg">arrow_back_ios</span>
                    <span className="text-xs font-bold uppercase">Quay lại</span>
                </button>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h2>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Tải file lên (TXT)"
                    >
                        <span className="material-symbols-outlined !text-xl">upload_file</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".txt" 
                    />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#131313] border-b border-gray-800 space-y-3">
                <div className="flex gap-3">
                    <input 
                        value={newKey}
                        onChange={e => setNewKey(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                        placeholder="Hán việt / Trung..."
                    />
                    <input 
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                        placeholder="Nghĩa..."
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={loading}
                        className="px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
                    >
                        +
                    </button>
                </div>
                <div className="relative">
                     <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 !text-lg">search</span>
                     <input 
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-black/20 border-none rounded-lg py-2 pl-9 pr-3 text-sm text-gray-400 focus:text-white focus:ring-1 focus:ring-white/20 placeholder:text-gray-600"
                        placeholder={`Tìm trong ${terms.length} mục...`}
                     />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {loading && (
                    <div className="py-8 text-center">
                        <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                        <p className="text-xs text-gray-500 mt-2">Đang xử lý dữ liệu...</p>
                    </div>
                )}
                {!loading && filteredTerms.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <span className="text-sm font-medium text-gray-300 font-mono">{t.key}</span>
                            <span className="text-sm text-primary">{t.value}</span>
                        </div>
                        <button 
                            onClick={() => handleDelete(t)}
                            className="p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span className="material-symbols-outlined !text-lg">delete</span>
                        </button>
                    </div>
                ))}
                {!loading && filteredTerms.length === 0 && (
                    <div className="text-center py-10 text-gray-600 italic text-xs">
                        Không tìm thấy dữ liệu.
                    </div>
                )}
            </div>
        </div>
    );
};


const QTranslateSettings: React.FC<QTranslateSettingsProps> = ({ isOpen, onClose, project, onUpdateProject }) => {
    const [currentView, setCurrentView] = useState<SettingsView>('MAIN');

    // Reset view when closed
    useEffect(() => {
        if (!isOpen) setCurrentView('MAIN');
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleAutoName = () => {
        onUpdateProject({
            settings: {
                ...project.settings,
                autoNameAnalysis: !project.settings.autoNameAnalysis
            }
        });
    };

    const SettingItem = ({ label, value, onClick }: { label: string, value?: string, onClick?: () => void }) => (
        <button 
            onClick={onClick}
            className="w-full flex items-center justify-between py-4 group transition-colors hover:bg-white/5 px-4 -mx-4 rounded-lg border-b border-gray-900/50 last:border-0"
        >
            <span className="text-base text-gray-300 group-hover:text-white transition-colors font-medium">{label}</span>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm text-gray-500">{value}</span>}
                <span className="material-symbols-outlined text-gray-600 !text-xl">chevron_right</span>
            </div>
        </button>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <div className="pt-6 pb-2 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>
        </div>
    );

    const renderContent = () => {
        switch (currentView) {
            case 'DICT_NAMES_COMMON':
                return <DictionaryEditor title="Names (Chung)" sourceType="common" onBack={() => setCurrentView('MAIN')} />;
            case 'DICT_VP_COMMON':
                return <DictionaryEditor title="VietPhrase (Chung)" sourceType="common" onBack={() => setCurrentView('MAIN')} />;
            case 'DICT_NAMES_PRIVATE':
                // For simplicity, mapping both Private Names & VP to Project Glossary for now, or separating if logic permits
                return <DictionaryEditor title="Names (Riêng)" sourceType="private" projectId={project.id} onBack={() => setCurrentView('MAIN')} />;
            case 'DICT_VP_PRIVATE':
                return <DictionaryEditor title="VietPhrase (Riêng)" sourceType="private" projectId={project.id} onBack={() => setCurrentView('MAIN')} />;
            default:
                return (
                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                        <SectionHeader title="Dữ Liệu Chung (Global)" />
                        <SettingItem label="Names (Tên riêng)" onClick={() => setCurrentView('DICT_NAMES_COMMON')} />
                        <SettingItem label="VietPhrases (Cụm từ)" onClick={() => setCurrentView('DICT_VP_COMMON')} />

                        <SectionHeader title={`Dữ Liệu Riêng (${project.title})`} />
                        <SettingItem label="Names (Tên nhân vật)" onClick={() => setCurrentView('DICT_NAMES_PRIVATE')} />
                        <SettingItem label="VietPhrases (Thuật ngữ)" onClick={() => setCurrentView('DICT_VP_PRIVATE')} />

                        <div className="mt-8 flex items-center justify-between py-4 border-t border-gray-800">
                            <div>
                                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Tự động nhận diện Tên</h3>
                                <p className="text-xs text-gray-500 mt-1">Sử dụng thuật toán NLP để đoán tên riêng chưa có trong từ điển.</p>
                            </div>
                            <button 
                                onClick={toggleAutoName}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${project.settings.autoNameAnalysis ? 'bg-primary' : 'bg-gray-800'}`}
                            >
                                <div className={`size-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${project.settings.autoNameAnalysis ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="mt-4 space-y-1">
                            <SettingItem 
                                label="Công cụ phân tích" 
                                value={project.settings.analysisTool || "LAC (Offline)"} 
                            />
                            <SettingItem 
                                label="Công cụ dịch" 
                                value={project.settings.translationTool || "QT (Offline)"} 
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full h-full max-w-lg bg-[#0a0a0a] flex flex-col shadow-2xl border-l border-white/10">
                
                {/* Header (Only show in MAIN view, sub-views have their own) */}
                {currentView === 'MAIN' && (
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-900 bg-[#0f0f0f]">
                        <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-base font-bold text-white line-clamp-1 flex-1 text-center px-4">
                            Cấu hình Dịch Thuật
                        </h2>
                        <div className="w-10"></div>
                    </div>
                )}

                {renderContent()}

                {/* Footer Simulation (Only in Main) */}
                {currentView === 'MAIN' && (
                    <div className="h-16 bg-[#0f0f0f] border-t border-gray-900 flex items-center justify-around px-8 mt-auto shrink-0">
                        <div className="size-6 rounded-sm border-2 border-gray-700 opacity-50"></div>
                        <div className="size-6 rounded-full border-2 border-gray-700 opacity-50"></div>
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-gray-700 opacity-50"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QTranslateSettings;
