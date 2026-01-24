import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { syncService } from '../services/mockServices';

interface WorkspaceProps {
  onOpenProject: (project: Project) => void;
  onCreateProject: (project: Project) => void;
  existingProjects: Project[]; // Local projects passed from App state
}

const Workspace: React.FC<WorkspaceProps> = ({ onOpenProject, onCreateProject, existingProjects = [] }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [filter, setFilter] = useState('');
  const [cloudProjects, setCloudProjects] = useState<Project[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- WORKFLOW: Load Cloud Data ---
  useEffect(() => {
    if (activeTab === 'cloud' && cloudProjects.length === 0) {
        setLoadingCloud(true);
        syncService.pullFromCloud('user-1').then(data => {
            setCloudProjects(data || []);
            setLoadingCloud(false);
        });
    }
  }, [activeTab]);

  // --- DERIVED STATE ---
  const currentList = activeTab === 'local' ? (existingProjects || []) : (cloudProjects || []);
  const displayedProjects = currentList.filter(p => 
      (p.title || '').toLowerCase().includes(filter.toLowerCase())
  );

  // --- WORKFLOW: Create Local Project ---
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const newProject: Project = {
          id: `local-${Date.now()}`,
          workspaceId: 'ws-default',
          title: formData.get('title') as string,
          author: formData.get('author') as string || 'Unknown',
          genres: ['Fantasy'], // Default
          sourceLang: 'Korean',
          targetLang: 'English',
          syncStatus: 'local', // Initial State
          isPublic: false,
          stats: {
              totalChapters: 0,
              translatedChapters: 0,
              glossaryTerms: 0,
              characters: 0,
              completionPercent: 0
          },
          settings: {
              allowPublicView: false,
              allowComments: false,
              requireApproval: false,
              allowEpubExport: false,
              allowContribution: false,
              showOnBulletin: false
          },
          updatedAt: new Date().toISOString()
      };
      onCreateProject(newProject);
      setIsCreateModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg-main pt-24 px-6 md:px-12 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TopBar / Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">My Workspace</h1>
                <p className="text-text-muted text-sm">Manage your translation projects and sync status.</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
                 {/* Search */}
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

        {/* Tabs */}
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
                Cloud Storage ({cloudProjects?.length || 0})
            </button>
        </div>

        {/* Grid */}
        {loadingCloud ? (
            <div className="py-20 flex justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Create Card */}
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all p-6 text-text-muted hover:text-white group min-h-[340px]"
                >
                    <div className="size-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 group-hover:border-primary/50">
                        <span className="material-symbols-outlined text-3xl group-hover:text-primary transition-colors">add</span>
                    </div>
                    <span className="font-bold text-sm tracking-wide uppercase">New Project</span>
                </button>

                {displayedProjects.map(project => (
                    <div 
                        key={project.id}
                        onClick={() => onOpenProject(project)}
                        className="group relative bg-[#1c1230] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col min-h-[340px] shadow-lg shadow-black/20"
                    >
                         {/* Cover Section */}
                         <div className="h-44 w-full relative bg-black/40 border-b border-white/5 overflow-hidden">
                             {project.coverImage ? (
                                 <img src={project.coverImage} alt="cover" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-105" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a1b4a] to-black">
                                    <span className="material-symbols-outlined !text-5xl text-white/10">book_2</span>
                                 </div>
                             )}
                             
                             {/* Floating Badges */}
                             <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                                {project.genres[0] || 'Novel'}
                             </div>
                             
                             {/* Cloud Status Indicator */}
                             <div className={`absolute top-3 left-3 size-8 rounded-full flex items-center justify-center backdrop-blur-md border ${
                                 project.syncStatus === 'synced' ? 'bg-success/20 border-success/30 text-success' :
                                 project.syncStatus === 'dirty' ? 'bg-warning/20 border-warning/30 text-warning' :
                                 'bg-white/10 border-white/10 text-text-muted'
                             }`}>
                                <span className="material-symbols-outlined !text-base">
                                    {project.syncStatus === 'synced' ? 'cloud_done' : 
                                     project.syncStatus === 'dirty' ? 'sync_problem' : 'cloud_off'}
                                </span>
                             </div>
                         </div>

                         {/* Content Section */}
                         <div className="p-5 flex flex-col flex-1 relative">
                             {/* Hover Gradient */}
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

      {/* Create Modal */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
              <form onSubmit={handleCreateSubmit} className="relative w-full max-w-md bg-bg-panel border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Create New Workspace</h2>
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
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                      <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-text-muted hover:text-white transition-colors">Cancel</button>
                      <button type="submit" className="px-6 py-2.5 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform active:scale-95">Create Workspace</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};

export default Workspace;