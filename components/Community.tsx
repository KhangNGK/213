import React from 'react';

const Community: React.FC = () => {
  return (
    <section className="mt-40 w-full max-w-5xl px-6 mx-auto relative mb-32">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-96 bg-primary/10 blur-[120px] rounded-full -z-10"></div>
        
        <div className="relative p-12 md:p-20 rounded-[2.5rem] overflow-hidden text-center flex flex-col items-center bg-[rgba(25,18,32,0.8)] border border-white/5">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 rounded-[2.5rem] p-[2px] bg-gradient-to-br from-primary to-accent-blue -z-10 opacity-50"></div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight font-display text-white">Connect with Fellow Translators</h2>
            
            <p className="text-white/60 font-sans text-lg mb-12 max-w-2xl leading-relaxed">
                Join our growing ecosystem of authors and translators. Share glossaries, discuss narrative techniques, and stay updated with the latest AI breakthroughs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
                <a href="#" className="group relative flex items-center gap-3 px-10 py-4 bg-primary rounded-xl font-bold text-white glow-button transition-all overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="material-symbols-outlined !text-2xl drop-shadow-[0_0_8px_white]">forum</span>
                    Join our Discord
                </a>
                
                <a href="#" className="group relative flex items-center gap-3 px-10 py-4 glass-card border-white/20 rounded-xl font-bold text-white hover:bg-white/5 transition-all">
                    <span className="material-symbols-outlined !text-2xl text-accent-blue drop-shadow-[0_0_8px_rgba(77,196,245,0.6)]">alternate_email</span>
                    Follow us on Twitter/X
                </a>
            </div>
        </div>
    </section>
  );
};

export default Community;