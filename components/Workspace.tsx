
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Chapter, ChapterStatus } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { fetchAndParseNovel } from '../services/crawler';

interface WorkspaceProps {
  onOpenProject: (project: Project) => void;
  onCreateProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onNavigateForum: () => void;
  existingProjects: Project[]; // Local projects passed from App state
}

const Workspace: React.FC<WorkspaceProps> = ({ onOpenProject, onCreateProject, onUpdateProject, onNavigateForum, existingProjects = [] }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [filter, setFilter] = useState('');
  const [cloudProjects, setCloudProjects] = useState<Project[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Create Modal State
  const [createTab, setCreateTab] = useState<'MANUAL' | 'CRAWL'>('MANUAL');
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);

  // Sync States
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pullingId, setPullingId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{
      type: 'PUSH' | 'PULL';
      project: Project;
  } | null>(null);

  // --- WORKFLOW: Load Cloud Data from Supabase ---
  
  const refreshCloudProjects = useCallback(async (isMounted: boolean = true) => {
      setLoadingCloud(true);
      setCloudError(null);
      try {
          const result = await dataService.fetchProjects();
          if (isMounted) {
              if (result.error) {
                  setCloudError(result.error);
                  setCloudProjects([]);
              } else {
                  setCloudProjects(result.data);
              }
              setLoadingCloud(false);
          }
      } catch (e) {
          if (isMounted) {
            setLoadingCloud(false);
          }
      }
  }, []);

  // Initial fetch when user is available
  useEffect(() => {
    let isMounted = true;
    if (user) {
        refreshCloudProjects(isMounted);
    }
    return () => {
        isMounted = false;
    };
  }, [user, refreshCloudProjects]);

  // --- DERIVED STATE ---
  const currentList = activeTab === 'local' ? (existingProjects || []) : (cloudProjects || []);
  const displayedProjects = currentList.filter(p => 
      (p.title || '').toLowerCase().includes(filter.toLowerCase())
  );

  // --- ACTION: Trigger Confirm Modal ---
  const requestSync = (e: React.MouseEvent, type: 'PUSH' | 'PULL', project: Project) => {
      e.stopPropagation();
      if (!user) {
          alert("Please login first to sync.");
          return;
      }
      setConfirmAction({ type, project });
  };

  // --- ACTION: Execute Push (Local -> Cloud) ---
  const handlePushToCloud = async () => {
      if (!confirmAction) return;
      const { project } = confirmAction;
      setPushingId(project.id);
      setConfirmAction(null); 
      
      try {
          const storedChapters = localStorage.getItem(`chapters-${project.id}`);
          const localChapters: Chapter[] = storedChapters ? JSON.parse(storedChapters) : [];

          const result = await dataService.pushToCloud(project, localChapters);

          if (result.error) {
              alert(`Sync failed: ${result.error}`);
          } else {
              alert("Project pushed successfully! Please switch to the 'Supabase Cloud' tab to manage public settings and view it in the Library.");
              refreshCloudProjects();
              setActiveTab('cloud');
          }
      } catch (err) {
          console.error(err);
          alert("An unexpected error occurred during sync.");
      } finally {
          setPushingId(null);
      }
  };

  // --- ACTION: Execute Pull (Cloud -> Local) ---
  const handlePullFromCloud = async () => {
      if (!confirmAction) return;
      const { project } = confirmAction;
      setPullingId(project.id);
      setConfirmAction(null); 

      try {
          const { chapters, error } = await dataService.pullFromCloud(project);
          
          if (error) {
              alert(`Download failed: ${error}`);
          } else {
              const existingLocal = existingProjects.find(p => p.id === project.id);
              
              const updatedProject: Project = {
                  ...project,
                  workspaceId: 'ws-default', 
                  syncStatus: 'synced',
                  lastSyncAt: new Date().toISOString()
              };

              localStorage.setItem(`chapters-${project.id}`, JSON.stringify(chapters));
              
              if (existingLocal) {
                  onUpdateProject(updatedProject);
              } else {
                  onCreateProject(updatedProject);
              }

              alert("Project downloaded successfully!");
              setActiveTab('local');
          }

      } catch (err) {
          console.error(err);
          alert("An unexpected error occurred during download.");
      } finally {
          setPullingId(null);
      }
  };

  // --- WORKFLOW: Create Local/Cloud Project ---
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      
      const newProjectData: Partial<Project> = {
          title: formData.get('title') as string,
          author: formData.get('author') as string || 'Unknown',
          genres: [formData.get('genre') as string || 'Fantasy'],
          description: formData.get('description') as string,
          sourceLang: formData.get('sourceLang') as string || 'Chinese',
          targetLang: formData.get('targetLang') as string || 'Vietnamese',
          isPublic: false,
      };

      if (activeTab === 'local') {
          const newProject: Project = {
            id: `local-${Date.now()}`,
            workspaceId: 'ws-default',
            ...newProjectData as any,
            stats: { totalChapters: 0, translatedChapters: 0, glossaryTerms: 0, characters: 0, completionPercent: 0 },
            syncStatus: 'local',
            settings: { 
                allowPublicView: false, allowComments: false, requireApproval: false, allowEpubExport: true, allowContribution: false, showOnBulletin: false,
                autoNameAnalysis: false, analysisTool: 'LAC', translationTool: 'QT' 
            },
            updatedAt: new Date().toISOString()
          };
          onCreateProject(newProject);
      } else {
          const result = await dataService.createProject(newProjectData);
          if (result.data) {
              setCloudProjects(prev => [result.data!, ...prev]);
          } else if (result.error) {
              alert(`Failed to create project: ${result.error}`);
          }
      }
      setIsCreateModalOpen(false);
  };

  const handleCrawlCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl) return;
    setIsCrawling(true);

    try {
        // SỬ DỤNG PARSER MỚI (NHANH HƠN AI)
        const result = await fetchAndParseNovel(crawlUrl, 'URL');
        
        const newProjectData: Partial<Project> = {
            title: result.project.title,
            author: result.project.author,
            genres: result.project.genres,
            description: result.project.description,
            coverImage: result.project.coverImage,
            sourceLang: result.project.sourceLang,
            targetLang: result.project.targetLang,
            isPublic: false
        };

        let createdProject: Project | null = null;

        if (activeTab === 'local') {
            createdProject = {
                id: `local-${Date.now()}`,
                workspaceId: 'ws-default',
                ...newProjectData as any,
                stats: { 
                    totalChapters: result.chapters.length, 
                    translatedChapters: 0, 
                    glossaryTerms: 0, 
                    characters: 0, 
                    completionPercent: 0 
                },
                syncStatus: 'local',
                settings: { 
                    allowPublicView: false, allowComments: false, requireApproval: false, allowEpubExport: true, allowContribution: false, showOnBulletin: false,
                    autoNameAnalysis: false, analysisTool: 'LAC', translationTool: 'QT'
                },
                updatedAt: new Date().toISOString()
            };
            onCreateProject(createdProject);
            
            // Save chapters locally
            const chapters: Chapter[] = result.chapters.map((c, i) => ({
                id: `local-ch-${Date.now()}-${i}`,
                projectId: createdProject!.id,
                index: c.index || (i + 1),
                titleOriginal: c.titleOriginal || `Chương ${i+1}`,
                titleTranslated: c.titleTranslated || `Chương ${i+1}`, 
                contentRaw: c.contentRaw || "", // URL is stored here if needed
                contentTranslated: "",
                status: 'raw',
                isDirty: true,
                version: 1,
                wordCount: 0,
                updatedAt: new Date().toISOString()
            }));
            localStorage.setItem(`chapters-${createdProject.id}`, JSON.stringify(chapters));

        } else {
            // Cloud creation
            const projRes = await dataService.createProject(newProjectData);
            if (projRes.error) throw new Error(projRes.error);
            createdProject = projRes.data;
            
            if (createdProject) {
                setCloudProjects(prev => [createdProject!, ...prev]);
                
                if (result.chapters.length > 0) {
                     const chaptersData = result.chapters.map((c, i) => ({
                        index: c.index || (i + 1),
                        titleOriginal: c.titleOriginal,
                        titleTranslated: c.titleTranslated,
                        status: 'raw' as ChapterStatus,
                        content_raw: c.contentRaw
                    }));
                    await dataService.createChaptersBatch(createdProject.id, chaptersData);
                }
            }
        }
        
        setIsCreateModalOpen(false);
        setCrawlUrl('');
        alert(`Đã tạo dự án "${result.project.title}" thành công với ${result.chapters.length} chương!`);

    } catch (e: any) {
        alert(`Lỗi khi tạo dự án từ URL: ${e.message}`);
    } finally {
        setIsCrawling(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main pt-24 px-6 md:px-12 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">My Workspace</h1>
                <p className="text-text-muted text-sm">Manage your translation projects and sync status.</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
                 <button 
                    onClick={onNavigateForum}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-white transition-colors"
                 >
                     <span className="material-symbols-outlined !text-lg">library_books</span>
                     Public Library
                 </button>

                 <div className="relative flex-1 md:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
                        <input 
                            type="text" 
                            placeholder="Filter projects..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-primary/50" 
                        />
                 </div>
                 
                 <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                 >
                     <span className="material-symbols-outlined !text-xl">add</span>
                     New Project
                 </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-8">
            <button 
                onClick={() => setActiveTab('local')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'local' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
            >
                <span className="material-symbols-outlined !text-lg">computer</span>
                Local Storage
            </button>
            <button 
                onClick={() => { setActiveTab('cloud'); refreshCloudProjects(); }}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cloud' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
            >
                <span className="material-symbols-outlined !text-lg">cloud</span>
                Supabase Cloud
            </button>
        </div>

        {/* Content Grid */}
        {activeTab === 'cloud' && loadingCloud ? (
             <div className="flex justify-center py-20">
                 <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
             </div>
        ) : displayedProjects.length === 0 ? (
             <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
                 <span className="material-symbols-outlined !text-4xl text-white/20 mb-4">folder_off</span>
                 <p className="text-text-muted">No projects found. Create one to get started.</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProjects.map(project => (
                    <div 
                        key={project.id}
                        onClick={() => onOpenProject(project)}
                        className="group relative bg-bg-panel border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col min-h-[280px]"
                    >
                         <div className="h-40 w-full relative bg-black/40 border-b border-white/5 overflow-hidden">
                             {project.coverImage ? (
                                 <img src={project.coverImage} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e1e24] to-black">
                                    <span className="material-symbols-outlined !text-4xl text-white/10">book_2</span>
                                 </div>
                             )}
                             
                             {/* Sync Status Badge */}
                             <div className="absolute top-3 right-3">
                                {activeTab === 'local' ? (
                                    <button 
                                        onClick={(e) => requestSync(e, 'PUSH', project)}
                                        className="size-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-accent-blue hover:bg-white transition-all border border-white/10"
                                        title="Push to Cloud"
                                    >
                                        {pushingId === project.id ? (
                                            <span className="material-symbols-outlined animate-spin !text-lg">sync</span>
                                        ) : (
                                            <span className="material-symbols-outlined !text-lg">cloud_upload</span>
                                        )}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={(e) => requestSync(e, 'PULL', project)}
                                        className="size-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-success hover:bg-white transition-all border border-white/10"
                                        title="Pull to Local"
                                    >
                                        {pullingId === project.id ? (
                                            <span className="material-symbols-outlined animate-spin !text-lg">sync</span>
                                        ) : (
                                            <span className="material-symbols-outlined !text-lg">cloud_download</span>
                                        )}
                                    </button>
                                )}
                             </div>
                         </div>

                         <div className="p-5 flex flex-col flex-1">
                             <div className="mb-4">
                                 <h3 className="font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                                 <p className="text-xs text-text-muted font-medium">{project.author}</p>
                             </div>

                             <div className="mt-auto flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                 <div className="flex items-center gap-1">
                                     <span className="material-symbols-outlined !text-sm">translate</span>
                                     <span>{project.targetLang}</span>
                                 </div>
                                 <div className="flex items-center gap-1">
                                      <span className="material-symbols-outlined !text-sm">format_list_numbered</span>
                                      <span>{project.stats.totalChapters} Ch</span>
                                 </div>
                             </div>
                             
                             <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                                 <div className="h-full bg-primary" style={{ width: `${project.stats.completionPercent}%` }}></div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        )}

      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
              <div className="relative w-full max-w-lg bg-bg-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="flex border-b border-white/5">
                      <button 
                        onClick={() => setCreateTab('MANUAL')}
                        className={`flex-1 py-4 text-sm font-bold uppercase ${createTab === 'MANUAL' ? 'bg-white/5 text-white border-b-2 border-primary' : 'text-text-muted hover:text-white'}`}
                      >
                          Manual Create
                      </button>
                      <button 
                        onClick={() => setCreateTab('CRAWL')}
                        className={`flex-1 py-4 text-sm font-bold uppercase ${createTab === 'CRAWL' ? 'bg-white/5 text-white border-b-2 border-primary' : 'text-text-muted hover:text-white'}`}
                      >
                          Import from URL
                      </button>
                  </div>
                  
                  <div className="p-6">
                      {createTab === 'MANUAL' ? (
                          <form onSubmit={handleCreateSubmit} className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-text-muted uppercase">Project Title</label>
                                  <input name="title" required className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-primary focus:outline-none" placeholder="My Awesome Novel" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-text-muted uppercase">Author</label>
                                      <input name="author" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-primary focus:outline-none" placeholder="Unknown" />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-text-muted uppercase">Genre</label>
                                      <input name="genre" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-primary focus:outline-none" placeholder="Fantasy" />
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-text-muted uppercase">Description</label>
                                  <textarea name="description" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-primary focus:outline-none h-24 resize-none" placeholder="Synopsis..." />
                              </div>
                              <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 mt-2">Create Project</button>
                          </form>
                      ) : (
                          <div className="space-y-4">
                              <div className="bg-accent/10 p-4 rounded-xl border border-accent/20 flex gap-3 items-start">
                                  <span className="material-symbols-outlined text-accent">auto_fix</span>
                                  <p className="text-xs text-white/80">Paste a link from a supported novel site (e.g. metruyenchu). Our AI will parse chapters and metadata automatically.</p>
                              </div>
                              <input 
                                value={crawlUrl}
                                onChange={e => setCrawlUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent focus:outline-none" 
                                placeholder="https://..." 
                              />
                              <button 
                                onClick={handleCrawlCreate}
                                disabled={isCrawling || !crawlUrl}
                                className="w-full py-3 bg-accent text-white font-bold rounded-xl shadow-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                  {isCrawling ? <><span className="material-symbols-outlined animate-spin">sync</span> Analyzing...</> : 'Import & Create'}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* CONFIRM SYNC MODAL */}
      {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmAction(null)}></div>
              <div className="relative w-full max-w-sm bg-bg-panel border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-center">
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                      <span className="material-symbols-outlined !text-3xl">
                          {confirmAction.type === 'PUSH' ? 'cloud_upload' : 'cloud_download'}
                      </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Confirm {confirmAction.type === 'PUSH' ? 'Upload' : 'Download'}</h3>
                  <p className="text-sm text-text-muted mb-6">
                      {confirmAction.type === 'PUSH' 
                        ? `Overwrite cloud data for "${confirmAction.project.title}" with your local version?`
                        : `Overwrite local data for "${confirmAction.project.title}" with the cloud version?`
                      }
                  </p>
                  <div className="flex gap-3">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-colors">Cancel</button>
                      <button 
                        onClick={() => confirmAction.type === 'PUSH' ? handlePushToCloud() : handlePullFromCloud()} 
                        className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Workspace;
