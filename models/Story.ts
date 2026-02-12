
import mongoose, { Schema, model, models } from 'mongoose';

const StorySchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  author: { type: String, required: true },
  description: { type: String },
  coverImage: { type: String }, // URL ảnh
  genres: [{ type: String }],
  status: { type: String, enum: ['Đang ra', 'Hoàn thành'], default: 'Đang ra' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index text search
StorySchema.index({ title: 'text', author: 'text' });

const Story = models.Story || model('Story', StorySchema);
export default Story;
