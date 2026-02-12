
import mongoose, { Schema, model, models } from 'mongoose';

const ChapterSchema = new Schema({
  storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
  title: { type: String, required: true },
  chapterNumber: { type: Number, required: true },
  content: { type: String, required: true }, // HTML hoặc Text
  createdAt: { type: Date, default: Date.now }
});

// Index để sort và query nhanh
ChapterSchema.index({ storyId: 1, chapterNumber: 1 });

const Chapter = models.Chapter || model('Chapter', ChapterSchema);
export default Chapter;
