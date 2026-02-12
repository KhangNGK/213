
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import slugify from 'slugify';

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Story Form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState('ongoing');
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage.from('covers').getPublicUrl(filePath);
      setCoverUrl(data.publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Auto-generate slug
    const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }) + '-' + Date.now().toString().slice(-4);
    
    const { error } = await supabase.from('stories').insert({
      title,
      slug,
      author,
      description: desc,
      cover_url: coverUrl,
      status,
      total_chapters: 0,
      views: 0
    });

    if (error) alert(error.message);
    else {
      alert('Tạo truyện thành công!');
      // Reset form
      setTitle(''); setAuthor(''); setDesc(''); setCoverUrl('');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="animate-spin text-4xl">↻</span></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition">Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 container mx-auto">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Hệ Thống Quản Trị</h1>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-500 font-bold hover:bg-red-50 px-3 py-1 rounded">Đăng xuất</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 border-b pb-2">Thêm Truyện Mới</h2>
                <form onSubmit={handleCreateStory} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tên truyện</label>
                        <input className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nhập tên..." value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tác giả</label>
                        <input className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nhập tác giả..." value={author} onChange={e => setAuthor(e.target.value)} required />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Trạng thái</label>
                        <select className="w-full p-2 border rounded bg-white" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="ongoing">Đang ra (Ongoing)</option>
                            <option value="completed">Hoàn thành (Completed)</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Ảnh bìa</label>
                        <div className="flex gap-2">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleUpload}
                                disabled={uploading}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                            />
                        </div>
                        {uploading && <p className="text-xs text-emerald-600 mt-1">Uploading...</p>}
                    </div>
                </div>

                {coverUrl && (
                    <div className="w-32 h-48 relative rounded overflow-hidden border">
                        <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Giới thiệu / Tóm tắt</label>
                    <textarea className="w-full p-2 border rounded h-32 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nội dung tóm tắt..." value={desc} onChange={e => setDesc(e.target.value)} />
                </div>

                <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition">
                    Lưu Truyện
                </button>
                </form>
            </div>
        </div>
        
        <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-bold mb-4">Hướng dẫn</h3>
                 <ul className="list-disc pl-4 text-sm text-gray-600 space-y-2">
                     <li>Ảnh bìa sẽ được tải lên <strong>Supabase Storage</strong> bucket "covers".</li>
                     <li>Slug sẽ được tự động tạo từ tên truyện.</li>
                     <li>Vui lòng tạo Chapter trong tab "Quản lý Chapter" (chưa implement trong demo này).</li>
                 </ul>
             </div>
        </div>
      </div>
    </div>
  );
}
