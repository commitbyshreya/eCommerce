import { Product } from '../models/Product.js';
import { demoStore, isDatabaseConnected } from '../utils/demoStore.js';

function buildQuery(filters = {}) {
  const query = {};
  if (filters.category) query.category = filters.category;
  if (filters.brand) query.brand = filters.brand;
  if (filters.search) query.name = { $regex: filters.search, $options: 'i' };
  if (filters.featured) query.featured = filters.featured === 'true';
  return query;
}

export async function getProducts(req, res) {
  const { page = 1, limit = 12, sort = 'createdAt', order = 'desc' } = req.query;
  const filters = buildQuery(req.query);

  try {
    if (isDatabaseConnected()) {
      const skip = (Number(page) - 1) * Number(limit);
      const products = await Product.find(filters)
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(Number(limit));

      const count = await Product.countDocuments(filters);

      return res.json({
        data: products,
        pagination: {
          total: count,
          page: Number(page),
          pages: Math.ceil(count / Number(limit)) || 1
        }
      });
    }

    // demo fallback
    const filtered = demoStore.products.filter((product) => {
      const matchesCategory = filters.category ? product.category === filters.category : true;
      const matchesBrand = filters.brand ? product.brand === filters.brand : true;
      const matchesSearch = filters.search
        ? product.name.toLowerCase().includes(filters.search.toLowerCase())
        : true;
      const matchesFeatured = filters.featured ? product.featured === (filters.featured === 'true') : true;
      return matchesCategory && matchesBrand && matchesSearch && matchesFeatured;
    });

    const start = (Number(page) - 1) * Number(limit);
    const data = filtered.slice(start, start + Number(limit));

    return res.json({
      data,
      pagination: {
        total: filtered.length,
        page: Number(page),
        pages: Math.ceil(filtered.length / Number(limit)) || 1
      }
    });
  } catch (error) {
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
    return res.status(500).json({ message: 'Unable to load product' });
  }
}

export async function getFilters(req, res) {
  if (isDatabaseConnected()) {
    const categories = await Product.distinct('category');
    const brands = await Product.distinct('brand');
    return res.json({ categories, brands });
  }

  const categories = [...new Set(demoStore.products.map((product) => product.category))];
  const brands = [...new Set(demoStore.products.map((product) => product.brand).filter(Boolean))];
  return res.json({ categories, brands });
}

export async function getFeatured(req, res) {
  if (isDatabaseConnected()) {
    const featuredProducts = await Product.find({ featured: true }).limit(8);
    return res.json(featuredProducts);
  }
  return res.json(demoStore.products.filter((product) => product.featured));
}
