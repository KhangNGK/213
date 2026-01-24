import React from 'react';

const PlatformItem: React.FC<{ icon: string; name: string }> = ({ icon, name }) => (
  <div className="flex items-center gap-4 grayscale opacity-40 transition-all duration-300 hover:grayscale-0 hover:opacity-100 cursor-pointer filter brightness-200 hover:drop-shadow-[0_0_15px_rgba(153,82,224,0.8)]">
    <span className="material-symbols-outlined !text-5xl text-white">{icon}</span>
    <span className="text-2xl font-bold tracking-tight text-white font-display">{name}</span>
  </div>
);

const Platforms: React.FC = () => {
  const items = [
    { icon: 'menu_book', name: 'KakaoPage' },
    { icon: 'auto_stories', name: 'Munpia' },
    { icon: 'description', name: 'Syosetu' },
    { icon: 'import_contacts', name: 'Webnovel' },
    { icon: 'library_books', name: 'Qidian' },
    // Duplicate for infinite scroll smoothness
    { icon: 'menu_book', name: 'KakaoPage' },
    { icon: 'auto_stories', name: 'Munpia' },
    { icon: 'description', name: 'Syosetu' },
    { icon: 'import_contacts', name: 'Webnovel' },
    { icon: 'library_books', name: 'Qidian' },
  ];

  return (
    <section className="mt-40 w-full max-w-6xl px-6 mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl font-black tracking-tight font-display text-white">Seamlessly Import from Your Favorite Platforms</h2>
        <p className="text-white/60 max-w-xl mx-auto font-sans">Native support for the web's biggest serial hubs.</p>
      </div>
      
      <div className="relative w-full overflow-hidden py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(153,82,224,0.1),transparent_60%)] pointer-events-none z-10"></div>
        {/* Left Fade */}
        <div className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-[#191220] to-transparent z-20"></div>
        {/* Right Fade */}
        <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-[#191220] to-transparent z-20"></div>
        
        <div className="flex overflow-hidden group">
          <div className="flex animate-marquee whitespace-nowrap gap-16 items-center">
            {items.map((item, idx) => (
                <PlatformItem key={idx} icon={item.icon} name={item.name} />
            ))}
          </div>
        </div>
      </div>
      
      <p className="text-center mt-8 text-white/50 text-sm font-sans italic">
        Don't see your platform? Use our custom URL scraper or upload your own files.
      </p>
    </section>
  );
};

export default Platforms;