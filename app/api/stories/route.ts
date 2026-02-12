
import connectDB from '@/lib/db';
import Story from '@/models/Story';
import { NextResponse } from 'next/server';
import slugify from 'slugify';

export async function GET(req: Request) {
  await connectDB();
  const stories = await Story.find({}).sort({ updatedAt: -1 }).limit(20);
  return NextResponse.json({ success: true, data: stories });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectDB();

    const slug = slugify(body.title, { lower: true, strict: true }) + '-' + Date.now();
    
    const story = await Story.create({
      ...body,
      slug
    });

    return NextResponse.json({ success: true, data: story }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
