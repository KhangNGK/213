
"use client";
import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
  chapterTitle: string;
  storyTitle: string;
  prevId?: string;
  nextId?: string;
  slug: string;
}

const FONTS = ['font-sans', 'font-serif', 'font-mono'];

export default function ReadingOptions({ children, chapterTitle, storyTitle, prevId, nextId, slug }: Props) {
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('font-sans');
  
  // Load settings from localStorage
  useEffect(() => {
    const storedSize = localStorage.getItem('reader_fontSize');
    if (storedSize) setFontSize(parseInt(storedSize));
    
    // Auto scroll to saved position (Demo feature)
    // const savedPos = localStorage.getItem(`pos_${slug}`);
    // if(savedPos) window.scrollTo(0, parseInt(savedPos));
  }, []);

  const changeSize = (delta: number) => {
    const newSize = Math.max(14, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem('reader_fontSize', newSize.toString());
  };

  return (
    <div>
      {/* Control Bar */}
      <div className="sticky top-16 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b dark:border-gray-700 p-2 flex justify-between items-center shadow-sm">
        <h2 className="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[50%]">
          {chapterTitle}
        </h2>
        
        <div className="flex gap-2 items-center">
          <button onClick={() => changeSize(-1)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-primary hover:text-white">A-</button>
          <span className="text-sm w-8 text-center">{fontSize}</span>
          <button onClick={() => changeSize(1)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-primary hover:text-white">A+</button>
          
          <select 
            value={fontFamily} 
            onChange={(e) => setFontFamily(e.target.value)}
            className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-sm"
          >
            <option value="font-sans">Sans</option>
            <option value="font-serif">Serif</option>
            <option value="font-mono">Mono</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div 
        className={`p-4 md:p-8 lg:px-16 leading-relaxed text-gray-800 dark:text-gray-300 ${fontFamily}`}
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
      >
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2 uppercase">{storyTitle}</h1>
            <h2 className="text-xl text-gray-500">{chapterTitle}</h2>
        </div>
        <hr className="mb-8 border-gray-300 dark:border-gray-700 w-1/2 mx-auto" />
        {children}
      </div>
    </div>
  );
}
