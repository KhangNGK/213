"use client";
import React from 'react';
import { useState, useEffect } from 'react';

interface ReaderControlProps {
  children?: React.ReactNode;
}

export default function ReaderControl({ children }: ReaderControlProps) {
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState('light'); // light, sepia, dark

  useEffect(() => {
    const savedSize = localStorage.getItem('reader_font_size');
    const savedTheme = localStorage.getItem('reader_theme');
    if (savedSize) setFontSize(parseInt(savedSize));
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const updateSize = (newSize: number) => {
    setFontSize(newSize);
    localStorage.setItem('reader_font_size', newSize.toString());
  };

  const updateTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('reader_theme', newTheme);
  };

  const getThemeClass = () => {
    switch(theme) {
      case 'dark': return 'bg-gray-900 text-gray-300';
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-white text-gray-900';
    }
  };

  return (
    <div className={`min-h-screen ${getThemeClass()} transition-colors duration-300`}>
      {/* Sticky Toolbar */}
      <div className="sticky top-16 z-40 p-2 flex justify-end gap-2 bg-opacity-90 backdrop-blur-sm border-b border-gray-200/20">
         <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 p-1 rounded-lg backdrop-blur">
            <button onClick={() => updateSize(Math.max(14, fontSize - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded">A-</button>
            <span className="text-sm w-6 text-center">{fontSize}</span>
            <button onClick={() => updateSize(Math.min(32, fontSize + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded">A+</button>
         </div>
         <select 
            value={theme} 
            onChange={(e) => updateTheme(e.target.value)}
            className="bg-black/10 dark:bg-white/10 rounded-lg px-2 text-sm focus:outline-none"
         >
            <option value="light">Sáng</option>
            <option value="sepia">Vàng</option>
            <option value="dark">Tối</option>
         </select>
      </div>

      <div 
        className="max-w-3xl mx-auto px-4 py-8 md:px-0 leading-loose"
        style={{ fontSize: `${fontSize}px` }}
      >
        {children}
      </div>
    </div>
  );
}