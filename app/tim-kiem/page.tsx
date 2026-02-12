
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Eye } from 'lucide-react';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; sort?: string } }) {
  const query = searchParams.q || '';
  const sort = searchParams.sort || 'latest'; // latest | views

  let dbQuery = supabase
    .from('stories')
    .select('id, title, slug, cover_url, author, status, views, updated_at');

  // Full-text search
  if (query) {
    // Searches 'title' and 'author' columns using textSearch
    dbQuery = dbQuery.textSearch('title', `'${query}'`, { type: 'websearch', config: 'english' });
    // Note: for advanced implementation, create a combined tsvector column in DB
  }

  // Sorting
  if (sort === 'views') {
    dbQuery = dbQuery.order('views', { ascending: false });
  } else {
    dbQuery = dbQuery.order('updated_at', { ascending: false });
  }

  const { data: stories } = await dbQuery.limit(20);

  return (
    <div className="container mx-auto">
      <div className="bg-gray-50 border-b border-gray-200 p-6 mb-8">
          <div className="max-w-2xl mx-auto">
             <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Search className="w-6 h-6 text-emerald-600" /> 
                {query ? `Kết quả cho: "${query}"` : 'Tìm kiếm truyện'}
             </h1>
             <form action="/tim-kiem" method="get" className="flex gap-2">
                 <input 
                    name="q" 
                    defaultValue={query}
                    type="text" 
                    placeholder="Nhập tên truyện hoặc tác giả..." 
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                 />
                 <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition">
                    Tìm
                 </button>
             </form>
             
             {/* Sort Filters */}
             <div className="flex gap-4 mt-4 text-sm">
                 <Link 
                    href={`/tim-kiem?q=${query}&sort=latest`}
                    className={`${sort === 'latest' ? 'text-emerald-600 font-bold underline' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    Mới cập nhật
                 </Link>
                 <Link 
                    href={`/tim-kiem?q=${query}&sort=views`}
                    className={`${sort === 'views' ? 'text-emerald-600 font-bold underline' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    Đọc nhiều
                 </Link>
             </div>
          </div>
      </div>
      
      {!stories || stories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-200">
             <p className="text-gray-500">Không tìm thấy truyện nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {stories.map((story) => (
            <Link href={`/truyen/${story.slug}`} key={story.id} className="group">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm mb-3 bg-gray-200">
                <Image
                  src={story.cover_url || '/placeholder.jpg'}
                  alt={story.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <span className="text-[10px] text-white/90 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {story.views.toLocaleString()}
                    </span>
                 </div>
              </div>
              <h3 className="font-bold text-sm text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                {story.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{story.author}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
