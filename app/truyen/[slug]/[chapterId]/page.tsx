
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReaderControl from '@/components/ReaderControl';
import { ChevronLeft, ChevronRight, List, Home } from 'lucide-react';

// Do not cache individual chapters indefinitely, or use a short revalidate
export const revalidate = 600; 

// Client Component Wrapper for View Counting could be added here
const IncrementView = async ({ id }: { id: string }) => {
    // This is a server action concept, but executed during render logic is tricky. 
    // Best practice: Use a client component with useEffect to call an API route.
    // For this implementation, we assume views are incremented via a client-side hook in ReaderControl 
    // or we sacrifice strict "pure" rendering and fire the RPC here (not recommended for GET requests usually).
    try {
        await supabase.rpc('increment_views', { row_id: id });
    } catch (e) {}
    return null;
};

export default async function ChapterReader({ params }: { params: { slug: string; chapterId: string } }) {
  // 1. Fetch Current Chapter + Story Info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, title, chapter_number, content, story_id, stories(id, title, slug)')
    .eq('id', params.chapterId)
    .single();

  if (!chapter) return notFound();

  const story = chapter.stories as any; // Type assertion for joined data

  // 2. Efficiently fetch Prev/Next IDs using indexes
  // We fetch only ID and chapter_number to minimize data
  const { data: prevChap } = await supabase
    .from('chapters')
    .select('id')
    .eq('story_id', story.id)
    .lt('chapter_number', chapter.chapter_number)
    .order('chapter_number', { ascending: false })
    .limit(1)
    .single();

  const { data: nextChap } = await supabase
    .from('chapters')
    .select('id')
    .eq('story_id', story.id)
    .gt('chapter_number', chapter.chapter_number)
    .order('chapter_number', { ascending: true })
    .limit(1)
    .single();
    
  // Increment view count for the story
  await IncrementView({ id: story.id });

  return (
    <ReaderControl>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
         <Link href="/" className="hover:text-emerald-600"><Home className="w-4 h-4" /></Link>
         <span>/</span>
         <Link href={`/truyen/${params.slug}`} className="hover:text-emerald-600 hover:underline decoration-emerald-500/30 underline-offset-4 line-clamp-1 max-w-[150px] md:max-w-none">
            {story.title}
         </Link>
         <span>/</span>
         <span className="text-gray-900">Chương {chapter.chapter_number}</span>
      </div>

      <div className="mb-10 text-center">
         <h1 className="text-2xl md:text-3xl font-bold mb-3 text-emerald-700">Chương {chapter.chapter_number}: {chapter.title}</h1>
         <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined !text-sm">book</span> {story.title}
         </p>
      </div>

      <div className="chapter-content text-lg leading-relaxed mb-16 font-serif text-justify whitespace-pre-wrap">
        {chapter.content}
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 shadow-lg md:relative md:bg-transparent md:border-0 md:shadow-none">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
             {prevChap ? (
               <Link href={`/truyen/${params.slug}/${prevChap.id}`} className="flex-1 bg-emerald-100 text-emerald-800 py-3 rounded-lg text-center font-bold hover:bg-emerald-200 flex items-center justify-center gap-1 transition-colors">
                 <ChevronLeft className="w-5 h-5" /> <span className="hidden md:inline">Chương Trước</span>
               </Link>
             ) : <button disabled className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-lg cursor-not-allowed font-medium">Đầu</button>}

             <Link href={`/truyen/${params.slug}`} className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center" title="Danh sách chương">
                <List className="w-6 h-6" />
             </Link>

             {nextChap ? (
               <Link href={`/truyen/${params.slug}/${nextChap.id}`} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg text-center font-bold hover:bg-emerald-700 flex items-center justify-center gap-1 transition-colors shadow-lg shadow-emerald-200">
                 <span className="hidden md:inline">Chương Sau</span> <ChevronRight className="w-5 h-5" />
               </Link>
             ) : <button disabled className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-lg cursor-not-allowed font-medium">Cuối</button>}
          </div>
      </div>
    </ReaderControl>
  );
}
