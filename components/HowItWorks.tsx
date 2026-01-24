import React from 'react';
import { StepCardProps } from '../types';

const StepCard: React.FC<StepCardProps> = ({ step, title, description, icon, glowColor, accentColor }) => (
  <div className="step-card group relative glass-card p-8 rounded-2xl border-white/10 flex flex-col items-center text-center gap-6 overflow-hidden transition-all duration-300 hover:border-white/20 hover:-translate-y-1">
    <div 
      className="step-glow transition-opacity duration-500 absolute inset-0 pointer-events-none rounded-2xl opacity-0" 
      style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)` }}
    ></div>
    
    <div className={`relative z-10 size-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-colors group-hover:border-[${accentColor}]/50`}>
      {icon}
    </div>
    
    <div className="relative z-10 space-y-2">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>{step}</div>
      <h3 className="text-2xl font-bold font-display text-white">{title}</h3>
      <p className="text-white/60 font-sans text-sm leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

const HowItWorks: React.FC = () => {
  return (
    <section className="mt-32 w-full max-w-6xl px-6 mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl font-black tracking-tight font-display text-white">How It Works</h2>
        <p className="text-white/60 max-w-xl mx-auto font-sans">Get your professional translation ready in just three simple steps.</p>
      </div>
      
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Connecting Line */}
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10"></div>
        
        <StepCard 
          step="Step 01"
          title="Import Content"
          description="Upload your source documents or paste raw chapter links. We support TXT, DOCX, and direct web ingestion."
          glowColor="rgba(153, 82, 224, 0.15)"
          accentColor="#9952e0"
          icon={
             <div className="relative flex flex-col items-center">
              <span className="material-symbols-outlined !text-4xl text-accent-blue animate-bounce">upload_file</span>
              <div className="absolute -bottom-2 w-8 h-1 bg-accent-blue/20 blur-sm rounded-full"></div>
            </div>
          }
        />
        
        <StepCard 
          step="Step 02"
          title="AI Translation"
          description="Our proprietary multi-LLM engine processes text through advanced AI models for maximum accuracy."
          glowColor="rgba(77,196,245,0.15)"
          accentColor="#4DC4F5"
          icon={
            <div className="flex gap-1">
              <span className="material-symbols-outlined !text-xl text-[#4DC4F5]">diamond</span>
              <span className="material-symbols-outlined !text-xl text-[#D97757]">auto_awesome</span>
              <span className="material-symbols-outlined !text-xl text-[#10A37F]">bolt</span>
            </div>
          }
        />
        
        <StepCard 
          step="Step 03"
          title="Export & Read"
          description="Instantly generate a perfectly formatted EPUB with custom covers, ready for your favorite e-reader."
          glowColor="rgba(242,105,184,0.15)"
          accentColor="#F269B8"
          icon={
            <span className="material-symbols-outlined !text-4xl text-accent-pink drop-shadow-[0_0_8px_rgba(242,105,184,0.6)]">menu_book</span>
          }
        />
      </div>
    </section>
  );
};

export default HowItWorks;