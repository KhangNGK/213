import React, { useState } from 'react';
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
import { ViewMode, Project } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('LANDING');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleNavigate = (view: ViewMode) => {
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

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return selectedProject ? (
            <ProjectDashboard 
                project={selectedProject} 
                onBack={() => handleNavigate('WORKSPACE')} 
            />
        ) : (
            handleNavigate('WORKSPACE') // Fallback
        );

      case 'WORKSPACE':
        return (
          <>
             <Navbar onNavigate={(view) => handleNavigate(view)} />
             <div className="relative min-h-screen">
                <div className="fixed inset-0 pointer-events-none bg-gradient-hero z-0"></div>
                <Workspace 
                    onOpenProject={handleOpenProject}
                    existingProjects={projects}
                    onCreateProject={handleCreateProject}
                />
             </div>
             <Footer />
          </>
        );

      case 'LANDING':
      default:
        return (
          <>
            <Navbar onNavigate={(view) => handleNavigate(view)} />
            <main className="relative z-10">
              <Hero />
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
    <div className="relative min-h-screen overflow-x-hidden bg-background-dark selection:bg-primary/30 text-white">
      {/* Global Background Elements */}
      {currentView === 'LANDING' && (
        <>
            <div className="fixed inset-0 pointer-events-none bg-gradient-hero z-0"></div>
            <div className="fixed inset-0 pointer-events-none particle-overlay z-0"></div>
        </>
      )}
      
      {renderContent()}
    </div>
  );
};

export default App;