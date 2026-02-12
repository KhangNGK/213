
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

interface StoryProps {
  story: {
    _id: string;
    title: string;
    slug: string;
    author: string;
    coverImage: string;
    status: string;
    updatedAt: string;
  }
}

const StoryCard: React.FC<StoryProps> = ({ story }) => {
  return (
    <Link href={`/truyen/${story.slug}`} className="group block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image 
          src={story.coverImage || '/placeholder.jpg'} 
          alt={story.title} 
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 20vw"
        />
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {story.status}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-primary min-h-[3rem]">
          {story.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {story.author}
        </p>
      </div>
    </Link>
  );
};

export default StoryCard;
