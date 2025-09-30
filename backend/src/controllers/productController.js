import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import {
  addDemoProduct,
  demoStore,
  isDatabaseConnected,
  updateDemoProduct,
  removeDemoProduct
} from '../utils/demoStore.js';
import { slugify, humanizeSlug } from '../utils/slugify.js';
import { ensureDatabaseConnection } from '../config/db.js';
import { config } from '../config/env.js';
import { extractUploadedImage } from '../middleware/upload.js';

function buildQuery(filters = {}) {
  const query = {};

  if (filters.search) {
    query.name = { $regex: filters.search, $options: 'i' };
  }

  if (filters.featured) {
    query.featured = filters.featured === 'true';
  }

  const minPrice = Number(filters.minPrice);
  const maxPrice = Number(filters.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    query.price = {};
    if (Number.isFinite(minPrice)) query.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) query.price.$lte = maxPrice;
  }

  const minRating = Number(filters.minRating);
  if (Number.isFinite(minRating) && minRating > 0) {
    query.rating = { $gte: minRating };
  }

  if (filters.inStockOnly === 'true') {
    query.stock = { $gt: 0 };
  }

  return query;
}

function parseBrandFilter(rawBrand = '') {
  return rawBrand
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function getProducts(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const sortField = typeof req.query.sort === 'string' && req.query.sort.trim() ? req.query.sort.trim() : 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;
  const brandValues = parseBrandFilter(req.query.brand || '');

  try {
    if (isDatabaseConnected()) {
      const dbQuery = buildQuery(req.query);

      if (brandValues.length > 1) {
        dbQuery.brand = { $in: brandValues };
      } else if (brandValues.length === 1) {
        dbQuery.brand = brandValues[0];
      }

      if (req.query.category) {
        const categoryFilter = req.query.category;
        const slugCandidate = slugify(categoryFilter);

        let categoryDoc = null;
        try {
          const matchers = [{ slug: slugCandidate }, { name: new RegExp(`^${categoryFilter}$`, 'i') }];
          if (mongoose.Types.ObjectId.isValid(categoryFilter)) {
            matchers.unshift({ _id: categoryFilter });
          }
          categoryDoc = await Category.findOne({ $or: matchers });
        } catch (_categoryError) {
          categoryDoc = null;
        }

        if (categoryDoc) {
          const categoryMatchers = [
            { categorySlug: categoryDoc.slug },
            { category: categoryDoc.name },
            { categoryId: categoryDoc._id }
          ];
          dbQuery.$or = Array.isArray(dbQuery.$or) ? [...dbQuery.$or, ...categoryMatchers] : categoryMatchers;
        } else {
          const fallbackMatchers = [
            { category: categoryFilter },
            { categorySlug: slugCandidate }
          ];
          dbQuery.$or = Array.isArray(dbQuery.$or)
            ? [...dbQuery.$or, ...fallbackMatchers]
            : fallbackMatchers;
        }
      }

      const skip = (page - 1) * limit;
      const [products, count] = await Promise.all([
        Product.find(dbQuery)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(dbQuery)
      ]);

      return res.json({
        data: products,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1
        }
      });
    }

    const slugFilter = req.query.category ? slugify(req.query.category) : '';
    const searchValue = (req.query.search || '').toLowerCase();
    const featuredFilter = req.query.featured;
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const minRating = Number(req.query.minRating);
    const inStockOnly = req.query.inStockOnly === 'true';

    const filtered = demoStore.products.filter((product) => {
      const productPrice = Number(product.price || 0);
      const productRating = Number(product.rating || 0);
      const productSlug = product.categorySlug || slugify(product.category);

      const matchesCategory = slugFilter ? productSlug === slugFilter : true;
      const matchesBrand = brandValues.length ? brandValues.includes(product.brand) : true;
      const matchesSearch = searchValue
        ? product.name.toLowerCase().includes(searchValue)
          || (product.description || '').toLowerCase().includes(searchValue)
        : true;
      const matchesFeatured = featuredFilter
        ? product.featured === (featuredFilter === 'true')
        : true;
      const matchesMinPrice = Number.isFinite(minPrice) ? productPrice >= minPrice : true;
      const matchesMaxPrice = Number.isFinite(maxPrice) ? productPrice <= maxPrice : true;
      const matchesRating = Number.isFinite(minRating) ? productRating >= minRating : true;
      const matchesStock = inStockOnly ? Number(product.stock || 0) > 0 : true;

      return (
        matchesCategory &&
        matchesBrand &&
        matchesSearch &&
        matchesFeatured &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesRating &&
        matchesStock
      );
    });

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return res.json({
      data,
      pagination: {
        total: filtered.length,
        page,
        pages: Math.ceil(filtered.length / limit) || 1
      }
    });
  } catch (_error) {
    return res.status(500).json({ message: 'Unable to load products' });
  }
}

export async function getProduct(req, res) {
  const { id } = req.params;

  try {
    if (isDatabaseConnected()) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
    }

    const product = demoStore.products.find((item) => item._id === id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found (demo)' });
    }
    return res.json(product);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.status(500).json({ message: 'Unable to load product' });
  }
}

export async function getFilters(_req, res) {
  try {
    if (isDatabaseConnected()) {
      const [categoriesDocs, brandValues, productStats] = await Promise.all([
        Category.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean(),
        Product.distinct('brand'),
        Product.aggregate([
          {
            $group: {
              _id: '$categorySlug',
              productCount: { $sum: 1 }
            }
          }
        ])
      ]);

      const statsMap = new Map(
        productStats.filter((item) => item._id).map((item) => [item._id, item.productCount])
      );

      const categories = categoriesDocs.map((category) => ({
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        image: category.image,
        productCount: statsMap.get(category.slug) || 0
      }));

      const knownSlugs = new Set(categories.map((category) => category.slug));
      productStats.forEach((stat) => {
        if (!stat._id || knownSlugs.has(stat._id)) return;
        categories.push({
          id: null,
          name: humanizeSlug(stat._id),
          slug: stat._id,
          description: '',
          icon: '',
          image: '',
          productCount: stat.productCount || 0
        });
      });

      const brands = brandValues
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      return res.json({ categories, brands });
    }
  } catch (_error) {
    // fall back to demo data
  }

  const categories = demoStore.categories.map((category) => ({
    id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    image: category.image,
    productCount: category.productCount || 0
  }));

  const brands = Array.from(
    new Set(demoStore.products.map((product) => product.brand).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return res.json({ categories, brands });
}

export async function getFeatured(_req, res) {
  if (isDatabaseConnected()) {
    const featuredProducts = await Product.find({ featured: true }).limit(8);
    return res.json(featuredProducts);
  }
  return res.json(demoStore.products.filter((product) => product.featured));
}

export async function createProduct(req, res) {
  const {
    name,
    description = '',
    price,
    category,
    categoryId,
    categorySlug: categorySlugRaw,
    brand = '',
    stock = 0,
    featured = false,
    images = [],
    image,
    rating,
    tags = []
  } = req.body;

  if (!name || typeof price === 'undefined') {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  if (!category && !categoryId) {
    return res.status(400).json({ message: 'Category is required' });
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }

  const numericStock = Number(stock);
  if (!Number.isFinite(numericStock) || numericStock < 0) {
    return res.status(400).json({ message: 'Stock must be zero or greater' });
  }

  const uploadedImage = extractUploadedImage(req.file);
  const ratingNumber = Number.isFinite(Number(rating)) ? Number(rating) : undefined;
  const featuredFlag = typeof featured === 'string'
    ? featured === 'true'
    : Boolean(featured);

  const normaliseImages = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .map((value) => (typeof value === 'string' ? value.trim() : value))
        .filter(Boolean);
    }
    if (typeof input === 'string') {
      return input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [];
  };

  const imageList = normaliseImages(images);

  const imageValue = typeof image === 'string' ? image.trim() : '';
  if (imageValue) {
    imageList.unshift(imageValue);
  }
  if (uploadedImage) {
    imageList.unshift(uploadedImage);
  }

  const preferDatabase = Boolean(config.mongoUri);

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      let categoryDoc = null;

      if (categoryId) {
        categoryDoc = await Category.findById(categoryId);
      }

      const categoryInput = (category || '').trim();
      const categorySlugInput = categorySlugRaw ? slugify(categorySlugRaw) : '';
      if (!categoryDoc && categoryInput) {
        const slugCandidate = slugify(categoryInput);
        categoryDoc = await Category.findOne({
          $or: [
            { slug: slugCandidate },
            { name: new RegExp(`^${categoryInput}$`, 'i') }
          ]
        });
      }

      if (!categoryDoc && categorySlugInput) {
        categoryDoc = await Category.findOne({ slug: categorySlugInput });
      }

      if (!categoryDoc) {
        return res.status(400).json({ message: 'Category not found' });
      }

      const payload = {
        name: name.trim(),
        description,
        price: numericPrice,
        category: categoryDoc.name,
        categoryId: categoryDoc._id,
        categorySlug: categoryDoc.slug,
        brand,
        stock: numericStock,
        featured: featuredFlag,
        images: imageList,
        tags: Array.isArray(tags) ? tags : []
      };

      if (typeof ratingNumber !== 'undefined') {
        payload.rating = ratingNumber;
      }

      const product = await Product.create(payload);

      return res.status(201).json(product);
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const payload = {
      name,
      description,
      price: numericPrice,
      category,
      categoryId,
      categorySlug: categorySlugRaw ? slugify(categorySlugRaw) : category ? slugify(category) : null,
      brand,
      stock: numericStock,
      featured: featuredFlag,
      images: imageList,
      tags
    };

    if (typeof ratingNumber !== 'undefined') {
      payload.rating = ratingNumber;
    }

    const product = addDemoProduct(payload);

    return res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This product already exists' });
    }
    return res.status(500).json({ message: 'Unable to create product' });
  }
}

export async function updateProduct(req, res) {
  const { id } = req.params;
  const preferDatabase = Boolean(config.mongoUri);

  const uploadedImage = extractUploadedImage(req.file);

  const normaliseImages = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .map((value) => (typeof value === 'string' ? value.trim() : value))
        .filter(Boolean);
    }
    if (typeof input === 'string') {
      return input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [];
  };

  const images = normaliseImages(req.body.images || req.body['images[]']);
  if (uploadedImage) {
    images.unshift(uploadedImage);
  }

  const updates = {
    name: req.body.name,
    description: req.body.description,
    price: typeof req.body.price !== 'undefined' ? Number(req.body.price) : undefined,
    stock: typeof req.body.stock !== 'undefined' ? Number(req.body.stock) : undefined,
    brand: req.body.brand,
    featured: typeof req.body.featured !== 'undefined' ? req.body.featured === 'true' || req.body.featured === true : undefined,
    rating: typeof req.body.rating !== 'undefined' ? Number(req.body.rating) : undefined,
    categorySlug: req.body.categorySlug,
    categoryId: req.body.categoryId,
    category: req.body.category
  };

  if (typeof updates.rating !== 'undefined' && !Number.isFinite(updates.rating)) {
    delete updates.rating;
  }

  if (images.length) {
    updates.images = images;
  } else if (typeof req.body.image === 'string' && req.body.image.trim()) {
    updates.images = [req.body.image.trim()];
  }

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      let categoryDoc = null;
      if (updates.categoryId) {
        categoryDoc = await Category.findById(updates.categoryId);
      }
      const categorySlugCandidate = updates.categorySlug ? slugify(updates.categorySlug) : null;
      if (!categoryDoc && categorySlugCandidate) {
        categoryDoc = await Category.findOne({ slug: categorySlugCandidate });
      }
      const categoryName = (updates.category || '').trim();
      if (!categoryDoc && categoryName) {
        categoryDoc = await Category.findOne({ name: new RegExp(`^${categoryName}$`, 'i') });
      }

      if (categoryDoc) {
        product.categoryId = categoryDoc._id;
        product.categorySlug = categoryDoc.slug;
        product.category = categoryDoc.name;
      } else if (categorySlugCandidate) {
        product.categorySlug = categorySlugCandidate;
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'undefined' || value === null || key.startsWith('category')) return;
        if (key === 'images') {
          product.images = value;
        } else if (key === 'featured') {
          product.featured = Boolean(value);
        } else {
          product[key] = value;
        }
      });

      if (product.images?.length) {
        product.image = product.images[0];
      }

      await product.save();

      return res.json(product);
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const record = updateDemoProduct(id, {
      ...updates,
      images: updates.images
    });
    if (!record) {
      return res.status(404).json({ message: 'Product not found (demo)' });
    }
    return res.json(record);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update product' });
  }
}

export async function deleteProduct(req, res) {
  const { id } = req.params;
  const preferDatabase = Boolean(config.mongoUri);

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      await product.deleteOne();
      return res.status(204).send();
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const removed = removeDemoProduct(id);
    if (!removed) {
      return res.status(404).json({ message: 'Product not found (demo)' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete product' });
  }
}
