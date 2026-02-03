import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: 'LOGIN' | 'REGISTER';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultView = 'LOGIN' }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>(defaultView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'REGISTER') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Registration successful! Check your email for confirmation.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose(); // Close modal on success
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-bg-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Tabs */}
        <div className="flex border-b border-white/5">
          <button 
            onClick={() => { setView('LOGIN'); setError(null); setMessage(null); }}
            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${view === 'LOGIN' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setView('REGISTER'); setError(null); setMessage(null); }}
            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${view === 'REGISTER' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            Sign Up
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-white/5 border border-white/10 mb-4">
               <span className="material-symbols-outlined text-white/80">{view === 'LOGIN' ? 'login' : 'person_add'}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{view === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-text-muted text-sm">
              {view === 'LOGIN' ? 'Enter your credentials to access your workspace.' : 'Join the platform for AI-powered translations.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors" 
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                required 
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors" 
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined !text-sm">error</span> {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined !text-sm">check_circle</span> {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin !text-lg">sync</span> Processing...
                </span>
              ) : (
                view === 'LOGIN' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <button onClick={onClose} className="w-full mt-4 text-xs font-bold text-text-muted hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;