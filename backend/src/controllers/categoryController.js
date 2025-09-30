import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import {
  addDemoCategory,
  demoStore,
  isDatabaseConnected,
  updateDemoCategory,
  removeDemoCategory
} from '../utils/demoStore.js';
import { slugify, humanizeSlug } from '../utils/slugify.js';
import { ensureDatabaseConnection } from '../config/db.js';
import { config } from '../config/env.js';
import { extractUploadedImage } from '../middleware/upload.js';

function toPlain(object) {
  return typeof object?.toObject === 'function' ? object.toObject({ virtuals: false }) : object;
}

function formatCategory(category, stats = {}) {
  const source = toPlain(category) || {};
  const id = source._id?.toString?.() ?? source.id ?? null;

  return {
    id,
    name: source.name || humanizeSlug(source.slug || ''),
    slug: source.slug || slugify(source.name || ''),
    description: source.description || '',
    icon: source.icon || '',
    image: source.image || '',
    isActive: source.isActive !== false,
    productCount: Number(stats.productCount ?? source.productCount ?? 0) || 0,
    averagePrice: Number(stats.averagePrice ?? source.averagePrice ?? 0) || 0,
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null
  };
}

export async function listCategories(_req, res) {
  try {
    if (isDatabaseConnected()) {
      const [categoriesDocs, stats] = await Promise.all([
        Category.find({}).sort({ name: 1 }).lean(),
        Product.aggregate([
          {
            $group: {
              _id: '$categorySlug',
              productCount: { $sum: 1 },
              averagePrice: { $avg: '$price' },
              lowStock: {
                $sum: {
                  $cond: [{ $lt: ['$stock', 10] }, 1, 0]
                }
              }
            }
          }
        ])
      ]);

      const statsMap = new Map(
        stats.filter((item) => item._id).map((item) => [item._id, item])
      );

      const categories = categoriesDocs.map((doc) => {
        const stat = statsMap.get(doc.slug) || {};
        return formatCategory(doc, stat);
      });

      const knownSlugs = new Set(categories.map((item) => item.slug));

      stats.forEach((entry) => {
        if (!entry._id || knownSlugs.has(entry._id)) return;
        categories.push(
          formatCategory(
            {
              name: humanizeSlug(entry._id),
              slug: entry._id,
              description: '',
              icon: '',
              image: '',
              isActive: true
            },
            entry
          )
        );
      });

      return res.json(categories);
    }
  } catch (_error) {
    // fall through to demo data response
  }

  const categories = demoStore.categories.map((category) =>
    formatCategory(category, {
      productCount: category.productCount,
      averagePrice: category.averagePrice,
      lowStock: category.lowStock
    })
  );

  return res.json(categories);
}

export async function createCategory(req, res) {
  const {
    name,
    slug,
    description = '',
    icon = '',
    image = '',
    isActive = true
  } = req.body;

  const resolvedName = (name || '').trim();
  const fallbackName = resolvedName || humanizeSlug(slug || '');
  const resolvedSlug = slugify(slug || resolvedName || fallbackName);

  if (!resolvedSlug) {
    return res.status(400).json({ message: 'Name or slug is required' });
  }

  const uploadedImage = extractUploadedImage(req.file);
  const imageValue = uploadedImage || (image || '').trim();

  const preferDatabase = Boolean(config.mongoUri);

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const existing = await Category.findOne({ slug: resolvedSlug });
      if (existing) {
        return res.status(409).json({ message: 'Category already exists' });
      }

      const category = await Category.create({
        name: fallbackName,
        slug: resolvedSlug,
        description,
        icon,
        image: imageValue,
        isActive
      });

      return res.status(201).json(formatCategory(category, { productCount: 0, averagePrice: 0 }));
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const record = addDemoCategory({
      name: fallbackName,
      slug: resolvedSlug,
      description,
      icon,
      image: imageValue,
      isActive
    });

    return res.status(201).json(
      formatCategory(record, {
        productCount: record.productCount,
        averagePrice: record.averagePrice
      })
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Category already exists' });
    }
    return res.status(500).json({ message: 'Unable to create category' });
  }
}

export async function updateCategory(req, res) {
  const { id } = req.params;
  const preferDatabase = Boolean(config.mongoUri);

  const updates = {
    name: req.body.name,
    slug: req.body.slug,
    description: req.body.description,
    icon: req.body.icon,
    isActive: typeof req.body.isActive === 'undefined' ? undefined : req.body.isActive === 'true'
  };

  const uploadedImage = extractUploadedImage(req.file);
  if (uploadedImage) {
    updates.image = uploadedImage;
  } else if (typeof req.body.image === 'string') {
    updates.image = req.body.image.trim();
  }

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      if (updates.slug) {
        const existingSlug = await Category.findOne({ slug: slugify(updates.slug), _id: { $ne: id } });
        if (existingSlug) {
          return res.status(409).json({ message: 'Category slug already in use' });
        }
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'undefined' || value === null || value === '') return;
        if (key === 'slug') {
          category.slug = slugify(value);
        } else if (key === 'isActive') {
          category.isActive = Boolean(value);
        } else {
          category[key] = value;
        }
      });

      await category.save();

      const stats = await Product.aggregate([
        { $match: { categorySlug: category.slug } },
        {
          $group: {
            _id: '$categorySlug',
            productCount: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            lowStock: {
              $sum: {
                $cond: [{ $lt: ['$stock', 10] }, 1, 0]
              }
            }
          }
        }
      ]);

      const stat = stats[0] || {};
      return res.json(formatCategory(category, stat));
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const record = updateDemoCategory(id, updates);
    if (!record) {
      return res.status(404).json({ message: 'Category not found (demo)' });
    }
    return res.json(formatCategory(record, {
      productCount: record.productCount,
      averagePrice: record.averagePrice,
      lowStock: record.lowStock
    }));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update category' });
  }
}

export async function deleteCategory(req, res) {
  const { id } = req.params;
  const preferDatabase = Boolean(config.mongoUri);

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const productsUsingCategory = await Product.countDocuments({ categoryId: category._id });
      if (productsUsingCategory > 0) {
        return res.status(409).json({ message: 'Cannot delete category with associated products' });
      }

      await category.deleteOne();
      return res.status(204).send();
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const removed = removeDemoCategory(id);
    if (!removed) {
      return res.status(404).json({ message: 'Category not found (demo)' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete category' });
  }
}
