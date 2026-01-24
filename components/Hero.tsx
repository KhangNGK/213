import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative z-10 flex flex-col items-center pt-20 pb-16 px-6">
      <div className="max-w-4xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Next-Gen AI Platform
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-gradient font-display">
          Novel Translator
        </h1>
        
        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-sans leading-relaxed">
          Professional AI translation for web novels with multi-LLM support. Experience unparalleled consistency and narrative depth in every chapter.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-lg font-bold rounded-xl glow-button hover:bg-primary/90">
            Translate Your First Novel
          </button>
          <button className="w-full sm:w-auto px-10 py-4 glass-card text-white rounded-xl border-white/10 hover:bg-white/5 transition-all font-bold">
            View Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;