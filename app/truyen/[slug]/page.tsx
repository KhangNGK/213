
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User, Eye, BookOpen, List, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const revalidate = 120; // Revalidate every 2 minutes

// Generate static params for top 20 stories to speed up build
export async function generateStaticParams() {
  const { data: stories } = await supabase
    .from('stories')
    .select('slug')
    .order('views', { ascending: false })
    .limit(20);

  return (stories || []).map((story) => ({
    slug: story.slug,
  }));
}

export default async function StoryDetail({ params }: { params: { slug: string } }) {
  // 1. Fetch Story Metadata
  const { data: story } = await supabase
    .from('stories')
    .select('*, genres(name, slug)')
    .eq('slug', params.slug)
    .single();

  if (!story) return notFound();

  // 2. Fetch First 50 Chapters (Pagination Logic would ideally go here for more)
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, chapter_number, created_at')
    .eq('story_id', story.id)
    .order('chapter_number', { ascending: true })
    .limit(50);

  const firstChapter = chapters?.[0];
  const lastChapter = chapters?.[chapters.length - 1];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden container mx-auto">
      {/* Hero Section */}
      <div className="relative">
         <div className="absolute inset-0 bg-gradient-to-b from-gray-900/10 to-transparent pointer-events-none h-32"></div>
         <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 relative z-10">
            {/* Cover Image */}
            <div className="flex-shrink-0 mx-auto md:mx-0 w-48 md:w-60 shadow-xl rounded-lg overflow-hidden border-4 border-white">
              <div className="aspect-[2/3] relative bg-gray-200">
                 <Image 
                    src={story.cover_url || '/placeholder.jpg'} 
                    alt={story.title} 
                    fill 
                    className="object-cover"
                    priority
                 />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col text-center md:text-left">
               <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">{story.title}</h1>
               
               <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm text-gray-600 mb-6">
                 <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {story.author}</span>
                 <span className="hidden md:inline text-gray-300">|</span>
                 <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${story.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {story.status === 'completed' ? 'Hoàn Thành' : 'Đang Ra'}
                 </span>
                 <span className="hidden md:inline text-gray-300">|</span>
                 <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {story.views.toLocaleString()}</span>
               </div>

               <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                 {story.genres?.map((g: any) => (
                   <span key={g.slug} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer border border-gray-200">
                     {g.name}
                   </span>
                 ))}
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                   <div className="text-center md:text-left">
                       <p className="text-xs text-gray-500 uppercase font-semibold">Số chương</p>
                       <p className="font-bold text-gray-900">{story.total_chapters}</p>
                   </div>
                   <div className="text-center md:text-left">
                       <p className="text-xs text-gray-500 uppercase font-semibold">Cập nhật</p>
                       <p className="font-bold text-gray-900 text-sm">{format(new Date(story.updated_at), 'dd/MM/yyyy')}</p>
                   </div>
               </div>
               
               {/* Actions */}
               <div className="mt-auto flex justify-center md:justify-start gap-4">
                  {firstChapter && (
                     <Link href={`/truyen/${story.slug}/${firstChapter.id}`} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-200 hover:-translate-y-0.5">
                        <BookOpen className="w-5 h-5" /> Đọc Từ Đầu
                     </Link>
                  )}
                  {/* Additional logic needed for "Continue Reading" cookie tracking */}
               </div>
            </div>
         </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-gray-100">
          {/* Description */}
          <div className="lg:col-span-8 p-6 md:p-8 border-r border-gray-100">
             <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                 <span className="material-symbols-outlined text-emerald-600">description</span> Giới Thiệu
             </h3>
             <div className="text-gray-600 text-sm leading-7 whitespace-pre-line text-justify">
                {story.description}
             </div>
          </div>
          
          {/* Chapter List */}
          <div className="lg:col-span-4 bg-gray-50/50">
             <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-100/50">
                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
                     <List className="w-5 h-5 text-emerald-600" /> Các Chương Mới
                 </h3>
                 <span className="text-xs text-gray-500">1 - {chapters?.length}</span>
             </div>
             <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {chapters?.map((chap) => (
                    <Link 
                        key={chap.id} 
                        href={`/truyen/${story.slug}/${chap.id}`}
                        className="block px-6 py-3 border-b border-gray-100 hover:bg-white hover:text-emerald-600 text-sm text-gray-600 transition-colors truncate"
                    >
                        <span className="font-medium mr-1">Chương {chap.chapter_number}:</span>
                        {chap.title}
                    </Link>
                ))}
                {story.total_chapters > 50 && (
                     <div className="p-4 text-center">
                         <span className="text-xs text-gray-400 italic">...và còn nhiều chương nữa...</span>
                     </div>
                )}
             </div>
          </div>
      </div>
    </div>
  );
}
