import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    categorySlug: { type: String, lowercase: true, trim: true, index: true },
    brand: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    images: [{ type: String }],
    featured: { type: Boolean, default: false },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

productSchema.pre('validate', function normaliseCategory(next) {
  if (this.category) {
    this.category = this.category.trim();
  }

  if (this.categorySlug) {
    this.categorySlug = slugify(this.categorySlug);
  }

  if (!this.categorySlug && this.category) {
    this.categorySlug = slugify(this.category);
  }

  next();
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
