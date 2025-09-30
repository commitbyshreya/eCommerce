import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

categorySchema.pre('validate', function normalise(next) {
  if (this.name) {
    this.name = this.name.trim();
  }

  if (this.slug) {
    this.slug = slugify(this.slug);
  }

  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  next();
});

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
