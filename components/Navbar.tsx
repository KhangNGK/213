"use client";
import React, { useState } from 'react';
import { Search, Menu, X, BookOpen } from 'lucide-react';

interface NavbarProps {
  onNavigate?: (view: any) => void;
  onOpenAuth?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, onOpenAuth }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Navigation mapping for the Workspace App
  const navLinks = [
      { label: 'Home', view: 'LANDING', href: '/' },
      { label: 'Workspace', view: 'WORKSPACE', href: '/admin' },
      { label: 'Library', view: 'FORUM', href: '/tim-kiem' },
  ];

  const handleNavClick = (link: { view: string, href: string }) => {
      if (onNavigate) {
          onNavigate(link.view);
      } else {
          window.location.href = link.href;
      }
      setIsOpen(false);
  };

  const handleAuthClick = () => {
      if (onOpenAuth) {
          onOpenAuth();
      } else {
          window.location.href = '/admin';
      }
      setIsOpen(false);
  };

  return (
    <nav className="bg-[#0f0b1a]/90 border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button onClick={() => onNavigate ? onNavigate('LANDING') : window.location.href = '/'} className="text-xl font-black text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BookOpen className="w-8 h-8 text-primary" />
            <span className="tracking-tight">Novel<span className="text-primary">Translator</span></span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center font-bold text-gray-400">
            {navLinks.map(link => (
                <button 
                    key={link.label} 
                    onClick={() => handleNavClick(link)}
                    className="hover:text-white transition-colors"
                >
                    {link.label}
                </button>
            ))}
            <button onClick={handleAuthClick} className="px-5 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
                Sign In
            </button>
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-gray-400 p-2 hover:text-white">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#1c1230] border-t border-white/10 p-4 space-y-4 shadow-2xl absolute left-0 right-0 z-50 animate-in slide-in-from-top-5">
            <div className="flex flex-col space-y-2 font-bold text-gray-400">
              {navLinks.map(link => (
                <button 
                    key={link.label} 
                    onClick={() => handleNavClick(link)}
                    className="block w-full text-left py-3 px-4 hover:bg-white/5 rounded-lg hover:text-white transition-colors"
                >
                    {link.label}
                </button>
              ))}
              <div className="border-t border-white/10 pt-4 mt-2">
                  <button onClick={handleAuthClick} className="block w-full text-center py-3 bg-primary text-white rounded-lg">Sign In</button>
              </div>
            </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;