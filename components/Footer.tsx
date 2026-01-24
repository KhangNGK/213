import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full border-t border-white/5 bg-background-dark/80 backdrop-blur-xl pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined !text-xl">auto_stories</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tighter text-white font-display">Novel</span>
                    </div>
                    <p className="text-white/50 font-sans leading-relaxed text-sm max-w-xs">
                        The definitive AI platform for high-fidelity web novel translation. Bridging stories across languages with narrative precision.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-bold mb-6 text-white tracking-wide uppercase text-xs font-display">Product</h4>
                    <ul className="space-y-4 text-white/50 text-sm font-sans">
                        <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">API Access</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-bold mb-6 text-white tracking-wide uppercase text-xs font-display">Resources</h4>
                    <ul className="space-y-4 text-white/50 text-sm font-sans">
                        <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Developer Blog</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Community Forum</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-bold mb-6 text-white tracking-wide uppercase text-xs font-display">Legal</h4>
                    <ul className="space-y-4 text-white/50 text-sm font-sans">
                        <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Cookie Settings</a></li>
                    </ul>
                </div>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-white/30 text-xs font-sans">
                    © 2024 Novel AI Platform. All rights reserved. Built for storytellers.
                </div>
                <div className="flex items-center gap-6">
                    <a href="#" className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                        <span className="material-symbols-outlined">forum</span>
                    </a>
                    <a href="#" className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                        <span className="material-symbols-outlined">alternate_email</span>
                    </a>
                    <a href="#" className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                        <span className="material-symbols-outlined">terminal</span>
                    </a>
                    <a href="#" className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                        <span className="material-symbols-outlined">groups</span>
                    </a>
                </div>
            </div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-32 bg-primary/10 blur-[100px] -z-10 rounded-full"></div>
    </footer>
  );
};

export default Footer;