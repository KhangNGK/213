import React from 'react';
import { FeatureCardProps } from '../types';

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, colorClass, iconColorClass }) => (
  <div className="glass-card p-8 rounded-2xl border-white/10 flex flex-col gap-6 group hover:border-primary/50 transition-all duration-300 hover:transform hover:-translate-y-1">
    <div className={`size-14 rounded-xl ${colorClass} flex items-center justify-center shadow-lg ${iconColorClass}`}>
      <span className="material-symbols-outlined !text-3xl text-white">{icon}</span>
    </div>
    <div className="space-y-3">
      <h3 className="text-2xl font-bold font-display text-white">{title}</h3>
      <p className="text-white/60 font-sans leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

const Features: React.FC = () => {
  return (
    <section className="mt-40 w-full max-w-7xl px-6 mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none font-display text-white">
            Advanced AI Features for <span className="text-primary">Master Translators</span>
          </h2>
          <p className="text-white/60 font-sans text-lg">
            Engineered to handle the complexity of serialized literature, maintaining context and tone across millions of words.
          </p>
        </div>
        <button className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
          Explore all features <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          icon="menu_book"
          title="Smart Glossary"
          description="Never lose character names or terminology. Our AI keeps consistency across 1000+ chapters with a persistent, dynamic glossary."
          colorClass="bg-gradient-to-br from-accent-pink to-primary"
          iconColorClass="shadow-primary/20"
        />
        <FeatureCard 
          icon="bolt"
          title="Batch Processing"
          description="Speed through content. Translate entire volumes in minutes with high-throughput parallel processing and context-aware stitching."
          colorClass="bg-gradient-to-br from-primary to-accent-blue"
          iconColorClass="shadow-accent-blue/20"
        />
        <FeatureCard 
          icon="file_download"
          title="Custom EPUB Export"
          description="Professional formatting out of the box. One-click export optimized for Kindle, Kobo, and all major e-readers with full CSS support."
          colorClass="bg-gradient-to-br from-accent-blue to-accent-pink"
          iconColorClass="shadow-accent-pink/20"
        />
      </div>
    </section>
  );
};

export default Features;