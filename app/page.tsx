
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, TrendingUp } from 'lucide-react';
import { Story } from '@/types';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

async function getHomepageData() {
  // 1. Fetch Latest Stories (Limit 24)
  const { data: latestStories } = await supabase
    .from('stories')
    .select('id, title, slug, cover_url, author, status, updated_at, genres(name)')
    .order('updated_at', { ascending: false })
    .limit(24);

  // 2. Fetch Hot Stories (Limit 10)
  const { data: hotStories } = await supabase
    .from('stories')
    .select('id, title, slug, views, author, cover_url')
    .order('views', { ascending: false })
    .limit(10);

  return { 
    latestStories: (latestStories as any[]) || [], 
    hotStories: (hotStories as Story[]) || [] 
  };
}

export default async function Home() {
  const { latestStories, hotStories } = await getHomepageData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 container mx-auto">
      {/* Main Content: Truyện Mới */}
      <div className="lg:col-span-8">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-emerald-600 uppercase flex items-center gap-2">
            <Clock className="w-5 h-5" /> Truyện Mới Cập Nhật
          </h2>
          <Link href="/tim-kiem?sort=latest" className="text-sm text-gray-500 hover:text-emerald-600">
            Xem tất cả
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {latestStories.map((story) => (
            <Link href={`/truyen/${story.slug}`} key={story.id} className="group block">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm mb-3 bg-gray-100">
                <Image
                  src={story.cover_url || '/placeholder.jpg'}
                  alt={story.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm text-white ${story.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}>
                  {story.status === 'completed' ? 'Full' : 'On'}
                </span>
              </div>
              <h3 className="font-bold text-sm text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors min-h-[40px]">
                {story.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{story.author}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Sidebar: Truyện Hot */}
      <aside className="lg:col-span-4 space-y-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-5 text-red-500 border-l-4 border-red-500 pl-3 uppercase flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Truyện Đọc Nhiều
          </h2>
          <ul className="space-y-4">
            {hotStories.map((story, index) => (
              <li key={story.id} className="flex gap-4 items-start group">
                <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${index < 3 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-500'}`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <Link href={`/truyen/${story.slug}`} className="font-semibold text-gray-800 hover:text-emerald-600 block line-clamp-2 transition-colors">
                    {story.title}
                  </Link>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span className="truncate max-w-[100px]">{story.author}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> {story.views.toLocaleString()}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
