import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { dataService } from '../services/dataService';

interface ForumProps {
  onSelectProject: (project: Project) => void;
  onBack: () => void;
}

const Forum: React.FC<ForumProps> = ({ onSelectProject, onBack }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPublicProjects = async () => {
      setLoading(true);
      const { data } = await dataService.fetchPublicProjects();
      setProjects(data);
      setLoading(false);
    };
    loadPublicProjects();
  }, []);

  return (
    <div className="min-h-screen bg-bg-main pt-24 px-6 md:px-12 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
             <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
             </button>
             <div>
                <h1 className="text-3xl font-black font-display text-white">Public Novel Library</h1>
                <p className="text-text-muted text-sm">Discover translations shared by the community.</p>
             </div>
        </div>

        {loading ? (
           <div className="py-20 flex justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
        ) : projects.length === 0 ? (
           <div className="py-20 text-center text-text-muted">
               <span className="material-symbols-outlined !text-4xl mb-2 opacity-50">menu_book</span>
               <p>No public novels found yet.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {projects.map(project => (
                  <div 
                      key={project.id}
                      onClick={() => onSelectProject(project)}
                      className="group relative bg-[#1c1230] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col min-h-[380px] shadow-lg shadow-black/20"
                  >
                       <div className="h-56 w-full relative bg-black/40 border-b border-white/5 overflow-hidden">
                           {project.coverImage ? (
                               <img src={project.coverImage} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a1b4a] to-black">
                                  <span className="material-symbols-outlined !text-5xl text-white/10">book_2</span>
                               </div>
                           )}
                           
                           {/* Genre Badge */}
                           <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                              {project.genres[0] || 'Novel'}
                           </div>
                       </div>

                       <div className="p-5 flex flex-col flex-1">
                           <div className="mb-4">
                               <h3 className="font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                   {project.title}
                               </h3>
                               <p className="text-xs text-text-muted font-medium mb-2">by {project.author}</p>
                           </div>

                           <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                               <div className="flex items-center gap-1">
                                   <span className="material-symbols-outlined !text-sm">translate</span>
                                   <span>{project.targetLang}</span>
                               </div>
                               <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined !text-sm">format_list_numbered</span>
                                    <span>{project.stats.translatedChapters} Ch</span>
                               </div>
                           </div>
                       </div>
                  </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Forum;
