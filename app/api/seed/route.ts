
import connectDB from '@/lib/db';
import Story from '@/models/Story';
import Chapter from '@/models/Chapter';
import { NextResponse } from 'next/server';
import slugify from 'slugify';

export async function GET() {
  await connectDB();
  
  // Clean DB
  await Story.deleteMany({});
  await Chapter.deleteMany({});

  const sampleStory = {
    title: "Đấu Phá Thương Khung",
    author: "Thiên Tàm Thổ Đậu",
    coverImage: "https://upload.wikimedia.org/wikipedia/vi/1/15/%C4%90%E1%BA%A5u_ph%C3%A1_th%C6%B0%C6%A1ng_khung.jpg",
    description: "Nơi đây là thuộc về thế giới đấu khí, không có hoa tiếu diễm lệ ma pháp, có, vẻn vẹn sinh sôi đến đỉnh phong đấu khí!",
    genres: ["Tiên Hiệp", "Huyền Huyễn"],
    slug: "dau-pha-thuong-khung"
  };

  const story = await Story.create(sampleStory);

  // Tạo 10 chương mẫu
  const chapters = [];
  for (let i = 1; i <= 10; i++) {
    chapters.push({
      storyId: story._id,
      title: `Tiêu Viêm`,
      chapterNumber: i,
      content: `<p>Đây là nội dung chương ${i}. Tiêu Viêm hít sâu một hơi...</p><p>Đấu khí trào dâng...</p>`
    });
  }

  await Chapter.insertMany(chapters);

  return NextResponse.json({ success: true, message: "Seed data created!" });
}
