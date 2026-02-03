import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import LiveDemo from './components/LiveDemo';
import Features from './components/Features';
import Platforms from './components/Platforms';
import Community from './components/Community';
import Footer from './components/Footer';
import Workspace from './components/Workspace';
import ProjectDashboard from './components/ProjectDashboard';
import ChapterEditor from './components/ChapterEditor'; // Import new component
import AuthModal from './components/AuthModal';
import Forum from './components/Forum';
import Reader from './components/Reader';
import { useAuth } from './contexts/AuthContext';
import { ViewMode, Project } from './types';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('LANDING');
  
  // Initialize projects from localStorage if available
  const [projects, setProjects] = useState<Project[]>(() => {
      try {
          const stored = localStorage.getItem('local_projects');
          return stored ? JSON.parse(stored) : [];
      } catch (e) {
          return [];
      }
  });

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Save projects to localStorage whenever they change
  useEffect(() => {
      localStorage.setItem('local_projects', JSON.stringify(projects));
  }, [projects]);

  // Hacky bridge for Dashboard to trigger Editor open without deep prop drilling if needed
  useEffect(() => {
      (window as any).triggerOpenEditor = (project: Project) => {
          setSelectedProject(project);
          setCurrentView('EDITOR');
      };
  }, []);

  const handleNavigate = (view: ViewMode) => {
    // Route Protection for Workspace
    if (view === 'WORKSPACE' && !user) {
        setIsAuthModalOpen(true);
        return;
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects([...projects, newProject]);
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('DASHBOARD');
  };

  const handleOpenReader = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('READER');
  };

  // New function to handle updates from Dashboard and persist to Workspace list
  const handleUpdateProject = (updatedProject: Project) => {
    // 1. Update the selected project state
    setSelectedProject(updatedProject);
    
    // 2. Update the list of projects
    setProjects(prevProjects => 
        prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  // Redirect if on Dashboard without a selected project
  useEffect(() => {
    if ((currentView === 'DASHBOARD' || currentView === 'EDITOR') && !selectedProject) {
      handleNavigate('WORKSPACE');
    }
  }, [currentView, selectedProject]);

  // Handle Logout -> Redirect
  useEffect(() => {
    if (!loading && !user && currentView === 'WORKSPACE') {
      setCurrentView('LANDING');
    }
  }, [user, loading, currentView]);

  if (loading) {
      return (
          <div className="min-h-screen bg-bg-main flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
          </div>
      );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return selectedProject ? (
            <ProjectDashboard 
                project={selectedProject} 
                onUpdateProject={handleUpdateProject}
                onBack={() => handleNavigate('WORKSPACE')}
                onOpenReader={() => handleOpenReader(selectedProject)}
            />
        ) : null;
      
      case 'EDITOR':
        return selectedProject ? (
            <ChapterEditor 
                project={selectedProject}
                onUpdateProject={handleUpdateProject}
                onBack={() => handleNavigate('DASHBOARD')}
            />
        ) : null;

      case 'WORKSPACE':
        return (
          <>
             <Navbar onNavigate={(view) => handleNavigate(view)} onOpenAuth={() => setIsAuthModalOpen(true)} />
             <div className="relative min-h-screen">
                <div className="fixed inset-0 pointer-events-none bg-gradient-hero z-0"></div>
                <Workspace 
                    onOpenProject={handleOpenProject}
                    existingProjects={projects}
                    onCreateProject={handleCreateProject}
                    onUpdateProject={handleUpdateProject}
                    onNavigateForum={() => handleNavigate('FORUM')}
                />
             </div>
             <Footer />
          </>
        );

      case 'FORUM':
        return (
            <>
                <Navbar onNavigate={(view) => handleNavigate(view)} onOpenAuth={() => setIsAuthModalOpen(true)} />
                <Forum 
                    onSelectProject={handleOpenReader} 
                    onBack={() => handleNavigate('LANDING')} 
                />
                <Footer />
            </>
        );

      case 'READER':
        return selectedProject ? (
            <Reader 
                project={selectedProject} 
                onBack={() => handleNavigate('FORUM')} 
            />
        ) : null;

      case 'LANDING':
      default:
        return (
          <>
            <Navbar onNavigate={(view) => handleNavigate(view)} onOpenAuth={() => setIsAuthModalOpen(true)} />
            <main className="relative z-10">
              <Hero onNavigate={() => handleNavigate('WORKSPACE')} />
              <HowItWorks />
              <LiveDemo />
              <Features />
              <Platforms />
              <Community />
            </main>
            <Footer />
          </>
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-dark selection:bg-primary/30 text-white font-ui">
      {/* Global Background Elements */}
      {currentView === 'LANDING' && (
        <>
            <div className="fixed inset-0 pointer-events-none bg-gradient-hero z-0"></div>
            <div className="fixed inset-0 pointer-events-none particle-overlay z-0"></div>
        </>
      )}
      
      {renderContent()}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

export default App;