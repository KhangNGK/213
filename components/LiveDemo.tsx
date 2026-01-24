import React, { useState, useCallback } from 'react';
import { ModelType } from '../types';
import { translateText } from '../services/geminiService';

const DEFAULT_SOURCE_TEXT = `그의 목소리가 어둠 속에서 들려왔다. "정말로 그 길을 가겠는가?" 
바람이 휘몰아치며 눈앞을 가렸지만, 소년은 고개를 끄덕였다. 이것은 단순한 여행이 아닌, 운명을 마주하는 일이었기에.`;

const DEFAULT_TRANSLATED_TEXT = `His voice echoed through the darkness. "Are you truly prepared to walk that path?" 
The wind howled, blinding his vision, but the young boy nodded. This was no mere journey; it was an appointment with destiny.`;

const LiveDemo: React.FC = () => {
  const [sourceText, setSourceText] = useState(DEFAULT_SOURCE_TEXT);
  const [translatedText, setTranslatedText] = useState(DEFAULT_TRANSLATED_TEXT);
  const [activeModel, setActiveModel] = useState<ModelType>(ModelType.GEMINI);
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = useCallback(async () => {
    setIsLoading(true);
    if (activeModel === ModelType.GEMINI) {
      const result = await translateText(sourceText);
      setTranslatedText(result);
    } else {
      // Mock delay for other models to simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTranslatedText("[System]: This model demo is currently unavailable. Please use Gemini for the live preview.");
    }
    setIsLoading(false);
  }, [sourceText, activeModel]);

  return (
    <section className="mt-40 w-full max-w-6xl px-6 mx-auto relative">
      <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      
      <div className="text-center mb-12 space-y-4">
        <h2 className="text-4xl font-black tracking-tight font-display text-white">Live Translation Demo</h2>
        <p className="text-white/60 max-w-xl mx-auto font-sans">See the difference in narrative tone across various state-of-the-art models.</p>
      </div>

      <div className="glass-card p-4 md:p-8 rounded-[2rem] border-white/10">
        {/* Model Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 bg-black/40 rounded-full border border-white/5">
            {[
              { id: ModelType.GEMINI, label: 'Gemini' },
              { id: ModelType.GPT, label: 'ChatGPT' },
              { id: ModelType.CLAUDE, label: 'Claude' }
            ].map((model) => (
              <button
                key={model.id}
                onClick={() => setActiveModel(model.id)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeModel === model.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* Translation Area */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Source Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Original Text (KR/JP)</span>
              <span className="material-symbols-outlined text-white/20">language</span>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full h-[300px] bg-black/40 border border-white/5 rounded-xl p-6 font-sans text-sm text-white/80 resize-none focus:outline-none focus:border-primary/50 transition-colors leading-relaxed"
              placeholder="Enter text to translate..."
            />
          </div>

          {/* Central Translate Button (Desktop) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:block">
            <button 
              onClick={handleTranslate}
              disabled={isLoading}
              className={`size-16 rounded-full bg-gradient-to-r from-primary to-accent-blue flex items-center justify-center text-white glow-button transition-transform ${isLoading ? 'animate-pulse cursor-not-allowed' : 'hover:scale-110'}`}
            >
              {isLoading ? (
                <span className="material-symbols-outlined !text-3xl animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined !text-3xl">translate</span>
              )}
            </button>
          </div>

          {/* Translated Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-accent-blue">Translated Text (EN)</span>
              <span className="material-symbols-outlined text-accent-blue/50">auto_awesome</span>
            </div>
            <div className="relative">
                <textarea
                  readOnly
                  value={translatedText}
                  className="w-full h-[300px] bg-black/40 border border-accent-blue/20 rounded-xl p-6 font-sans text-sm text-white/80 resize-none focus:outline-none transition-colors leading-relaxed"
                />
                 {isLoading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="size-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-accent-blue text-xs font-bold tracking-widest animate-pulse">TRANSLATING...</span>
                        </div>
                    </div>
                 )}
            </div>
          </div>

          {/* Mobile Translate Button */}
          <button 
            onClick={handleTranslate}
            disabled={isLoading}
            className="md:hidden w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent-blue font-bold flex items-center justify-center gap-2 text-white glow-button"
          >
             {isLoading ? (
                <>
                    <span className="material-symbols-outlined animate-spin">refresh</span> Processing...
                </>
              ) : (
                <>
                    <span className="material-symbols-outlined">translate</span> Translate Now
                </>
              )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default LiveDemo;