
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Chapter } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';

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
            settings: { allowPublicView: false, allowComments: false, requireApproval: false, allowEpubExport: false, allowContribution: false, showOnBulletin: false },
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
                        className="w-full bg-bg-panel border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/20"
                    />
                </div>
            </div>
        </div>

        <div className="flex gap-6 border-b border-white/5">
            <button 
                onClick={() => setActiveTab('local')}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'local' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
            >
                Local Storage ({existingProjects?.length || 0})
            </button>
            <button 
                onClick={() => setActiveTab('cloud')}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cloud' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
            >
                Supabase Cloud ({cloudProjects?.length || 0})
            </button>
        </div>

        {cloudError && activeTab === 'cloud' && (
            (cloudError.includes('Could not find the table') || cloudError.includes('relation "public.projects" does not exist')) ? (
                 <div className="p-6 rounded-2xl bg-bg-panel border border-warning/20 flex flex-col items-center justify-center text-center gap-4">
                    <div className="size-12 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-2">
                        <span className="material-symbols-outlined !text-3xl">database</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Database Not Initialized</h3>
                        <p className="text-text-muted text-sm mt-1 max-w-lg">
                            The `projects` table is missing. Please initialize your Supabase schema using the SQL provided in the Dashboard or SQL Editor.
                        </p>
                    </div>
                 </div>
            ) : (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    {cloudError}
                </div>
            )
        )}

        {loadingCloud && activeTab === 'cloud' && cloudProjects.length === 0 ? (
            <div className="py-20 flex justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all p-6 text-text-muted hover:text-white group min-h-[340px]"
                >
                    <div className="size-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 group-hover:border-primary/50">
                        <span className="material-symbols-outlined text-3xl group-hover:text-primary transition-colors">add</span>
                    </div>
                    <span className="font-bold text-sm tracking-wide uppercase">New Project</span>
                </button>

                {!loadingCloud && !cloudError && displayedProjects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-text-muted italic">
                        No projects found in {activeTab} storage.
                    </div>
                )}

                {displayedProjects.map(project => (
                    <div 
                        key={project.id}
                        onClick={() => onOpenProject(project)}
                        className="group relative bg-[#1c1230] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col min-h-[340px] shadow-lg shadow-black/20"
                    >
                         <div className="h-44 w-full relative bg-black/40 border-b border-white/5 overflow-hidden">
                             {project.coverImage ? (
                                 <img src={project.coverImage} alt="cover" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-105" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a1b4a] to-black">
                                    <span className="material-symbols-outlined !text-5xl text-white/10">book_2</span>
                                 </div>
                             )}
                             
                             <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                                {project.genres[0] || 'Novel'}
                             </div>
                             
                             <div className="absolute top-3 left-3 flex items-center gap-2">
                                 {activeTab === 'local' && (
                                    <button 
                                        onClick={(e) => requestSync(e, 'PUSH', project)}
                                        disabled={pushingId === project.id}
                                        className="size-8 rounded-full flex items-center justify-center backdrop-blur-md border bg-black/40 border-white/20 text-white hover:bg-primary hover:border-primary transition-colors z-20 shadow-xl"
                                        title="Push to Cloud"
                                    >
                                        {pushingId === project.id ? (
                                            <span className="material-symbols-outlined animate-spin !text-base">sync</span>
                                        ) : (
                                            <span className="material-symbols-outlined !text-base">cloud_upload</span>
                                        )}
                                    </button>
                                 )}

                                 {activeTab === 'cloud' && (
                                    <button 
                                        onClick={(e) => requestSync(e, 'PULL', project)}
                                        disabled={pullingId === project.id}
                                        className="size-8 rounded-full flex items-center justify-center backdrop-blur-md border bg-black/40 border-white/20 text-white hover:bg-accent hover:border-accent transition-colors z-20 shadow-xl"
                                        title="Download to Local"
                                    >
                                        {pullingId === project.id ? (
                                            <span className="material-symbols-outlined animate-spin !text-base">sync</span>
                                        ) : (
                                            <span className="material-symbols-outlined !text-base">cloud_download</span>
                                        )}
                                    </button>
                                 )}
                                 
                                 <div className={`size-8 rounded-full flex items-center justify-center backdrop-blur-md border ${
                                     project.syncStatus === 'synced' ? 'bg-success/20 border-success/30 text-success' :
                                     project.syncStatus === 'dirty' ? 'bg-warning/20 border-warning/30 text-warning' :
                                     'bg-white/10 border-white/10 text-text-muted'
                                 }`}>
                                    <span className="material-symbols-outlined !text-base">
                                        {project.syncStatus === 'synced' ? 'cloud_done' : 
                                         project.syncStatus === 'dirty' ? 'sync_problem' : 
                                         activeTab === 'local' ? 'dns' : 'cloud_off'}
                                    </span>
                                 </div>
                             </div>
                         </div>

                         <div className="p-5 flex flex-col flex-1 relative">
                             <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                             <div className="mb-4 relative z-10">
                                 <h3 className="font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors line-clamp-1 leading-tight">
                                     {project.title}
                                 </h3>
                                 <p className="text-xs text-text-muted font-medium mb-3">{project.author}</p>
                                 
                                 <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase tracking-wider font-bold">
                                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{project.sourceLang}</span>
                                    <span className="material-symbols-outlined !text-xs text-white/20">arrow_forward</span>
                                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{project.targetLang}</span>
                                 </div>
                             </div>

                             <div className="mt-auto space-y-3 relative z-10">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
                                        <span>Completion</span>
                                        <span className="text-primary">{project.stats.completionPercent}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${project.stats.completionPercent}%` }}></div>
                                    </div>
                                </div>
                                
                                <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined !text-sm">format_list_numbered</span>
                                        <span>{project.stats.translatedChapters} / {project.stats.totalChapters} Chaps</span>
                                    </div>
                                </div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmAction(null)}></div>
              <div className="relative w-full max-w-sm bg-bg-panel border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                  <div className={`size-12 rounded-full flex items-center justify-center mb-4 ${confirmAction.type === 'PUSH' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                      <span className="material-symbols-outlined !text-3xl">
                          {confirmAction.type === 'PUSH' ? 'cloud_upload' : 'cloud_download'}
                      </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                      {confirmAction.type === 'PUSH' ? 'Push to Cloud?' : 'Download from Cloud?'}
                  </h3>
                  <p className="text-sm text-text-muted mb-6">
                      {confirmAction.type === 'PUSH' 
                        ? 'This will overwrite the cloud version with your local data. Existing cloud data may be lost if not synced.' 
                        : 'This will overwrite your local project with the version from Supabase. Any unsaved local changes will be lost.'}
                  </p>
                  <div className="flex gap-3">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-text-muted hover:text-white hover:bg-white/5 transition-colors">
                          Cancel
                      </button>
                      <button 
                        onClick={confirmAction.type === 'PUSH' ? handlePushToCloud : handlePullFromCloud}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${confirmAction.type === 'PUSH' ? 'bg-primary hover:bg-primary/90' : 'bg-warning hover:bg-warning/90'}`}
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
              <form onSubmit={handleCreateSubmit} className="relative w-full max-w-md bg-bg-panel border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Create New {activeTab === 'local' ? 'Local' : 'Cloud'} Project</h2>
                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-text-muted hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  
                  <div className="space-y-5">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Project Title</label>
                          <input name="title" required className="w-full bg-bg-main border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors" placeholder="e.g. The Beginning After The End" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Author</label>
                          <input name="author" className="w-full bg-bg-main border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors" placeholder="Author Name" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Source Lang</label>
                              <select name="sourceLang" defaultValue="Chinese" className="w-full bg-bg-main border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors appearance-none">
                                    <option value="Chinese">Chinese</option>
                                    <option value="Korean">Korean</option>
                                    <option value="Japanese">Japanese</option>
                                    <option value="English">English</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Target Lang</label>
                              <select name="targetLang" defaultValue="Vietnamese" className="w-full bg-bg-main border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors appearance-none">
                                    <option value="Vietnamese">Vietnamese</option>
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="Indonesian">Indonesian</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Primary Genre</label>
                          <select name="genre" className="w-full bg-bg-main border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors appearance-none">
                                <option value="Fantasy">Fantasy</option>
                                <option value="Action">Action</option>
                                <option value="Romance">Romance</option>
                                <option value="System">System</option>
                                <option value="Cultivation">Cultivation</option>
                                <option value="Sci-fi">Sci-fi</option>
                                <option value="Wuxia">Wuxia</option>
                                <option value="Isekai">Isekai</option>
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Description</label>
                          <textarea name="description" className="w-full bg-bg-main border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors h-24 resize-none custom-scrollbar" placeholder="Short description..." />
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                      <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-text-muted hover:text-white transition-colors">Cancel</button>
                      <button type="submit" className="px-6 py-2.5 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform active:scale-95">Create Project</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};

export default Workspace;
