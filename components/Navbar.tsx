import React from 'react';

interface NavbarProps {
  onNavigate: (view: 'LANDING' | 'WORKSPACE') => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-center">
      <nav className="max-w-7xl w-full flex items-center justify-between glass-card px-8 py-3 rounded-full border-white/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('LANDING')}>
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined !text-xl">auto_stories</span>
          </div>
          <span className="text-2xl font-bold tracking-tighter font-display text-white">Novel</span>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <a href="#" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">Features</a>
          <a href="#" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">Pricing</a>
          <a href="#" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">Library</a>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium px-4 py-2 text-white hover:text-primary transition-colors">Login</button>
          <button 
            onClick={() => onNavigate('WORKSPACE')}
            className="bg-primary px-6 py-2 rounded-full text-sm font-bold text-white glow-button hover:bg-primary/90"
          >
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;