import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ViewMode } from '../types';

interface NavbarProps {
  onNavigate: (view: ViewMode) => void;
  onOpenAuth: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, onOpenAuth }) => {
  const { user, signOut } = useAuth();

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
          <button onClick={() => onNavigate('FORUM')} className="text-sm font-medium text-white/80 hover:text-primary transition-colors">Thư Viện</button>
          <a href="#" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">Tính Năng</a>
          <a href="#" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">Bảng Giá</a>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-bold text-white">{user.email?.split('@')[0]}</span>
                    <span className="text-[10px] text-primary uppercase">Pro Plan</span>
                </div>
                <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent border border-white/20 flex items-center justify-center text-white font-bold">
                    {user.email?.[0].toUpperCase()}
                </div>
                <button 
                    onClick={() => { signOut(); onNavigate('LANDING'); }}
                    className="p-2 text-text-muted hover:text-danger transition-colors"
                    title="Đăng Xuất"
                >
                    <span className="material-symbols-outlined !text-xl">logout</span>
                </button>
            </div>
          ) : (
            <>
              <button 
                onClick={onOpenAuth}
                className="text-sm font-medium px-4 py-2 text-white hover:text-primary transition-colors"
              >
                Đăng Nhập
              </button>
              <button 
                onClick={() => { onOpenAuth(); }}
                className="bg-primary px-6 py-2 rounded-full text-sm font-bold text-white glow-button hover:bg-primary/90"
              >
                Bắt Đầu
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;