import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { demoOrders, demoProducts, demoUsers } from './demoData.js';
import { slugify, humanizeSlug } from './slugify.js';

const now = new Date().toISOString();

const hashedUsers = demoUsers.map((user, index) => ({
  ...user,
  _id: `demo-user-${index + 1}`,
  password: bcrypt.hashSync(user.password, 10),
  createdAt: now,
  updatedAt: now
}));

const rawCategoryNames = Array.from(
  new Set(demoProducts.map((product) => product.category || 'General'))
);

const demoCategories = rawCategoryNames.map((name, index) => {
  const slug = slugify(name || `category-${index + 1}`);
  return {
    _id: `demo-category-${index + 1}`,
    name: name || humanizeSlug(slug) || `Category ${index + 1}`,
    slug,
    description: '',
    icon: '🛠️',
    image: '',
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
});

const categoryBySlug = new Map(demoCategories.map((category) => [category.slug, category]));
const categoryByName = new Map(demoCategories.map((category) => [category.name.toLowerCase(), category]));

function normaliseOrderItem(item) {
  if (!item) return item;
  const quantityValue = Number(item.quantity ?? item.qty ?? 1);
  return {
    product: item.product ?? item.productId ?? null,
    name: item.name ?? item.title ?? 'Item',
    price: Number(item.price ?? 0),
    quantity: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1
  };
}

const demoState = {
  categories: demoCategories,
  products: demoProducts.map((product, index) => {
    const baseName = product.category || 'General';
    const slug = slugify(baseName);
    const categoryRef = categoryBySlug.get(slug) || categoryByName.get(baseName.toLowerCase());

    return {
      ...product,
      _id: `demo-product-${index + 1}`,
      category: categoryRef?.name || humanizeSlug(slug) || 'General',
      categoryId: categoryRef?._id || null,
      categorySlug: categoryRef?.slug || slug,
      images: Array.isArray(product.images) && product.images.length ? product.images : product.image ? [product.image] : [],
      image: Array.isArray(product.images) && product.images.length
        ? product.images[0]
        : product.image || '',
      createdAt: now,
      updatedAt: now
    };
  }),
  users: hashedUsers,
  orders: []
};

demoState.orders = demoOrders.map((order, index) => ({
  ...order,
  _id: `demo-order-${index + 1}`,
  user: demoState.users[0]._id,
  items: order.items.map(normaliseOrderItem),
  createdAt: now,
  updatedAt: now
}));

function recomputeCategoryStats() {
  demoState.categories = demoState.categories.map((category) => {
    const related = demoState.products.filter((product) => product.categorySlug === category.slug);
    const productCount = related.length;
    const averagePrice = productCount
      ? related.reduce((sum, product) => sum + Number(product.price || 0), 0) / productCount
      : 0;
    const lowStock = related.filter((product) => Number(product.stock || 0) < 10).length;
    return {
      ...category,
      productCount,
      averagePrice,
      lowStock
    };
  });
}

recomputeCategoryStats();

export function isDatabaseConnected() {
  return mongoose.connection?.readyState === 1;
}

export const demoStore = demoState;

export function findDemoUserByEmail(email) {
  return demoStore.users.find((user) => user.email === email.toLowerCase());
}

export function findDemoUserById(id) {
  return demoStore.users.find((user) => user._id === id);
}

export function addDemoUser(user) {
  const nextIndex = demoStore.users.length + 1;
  const newUser = {
    ...user,
    _id: `demo-user-${nextIndex}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  demoStore.users.push(newUser);
  return newUser;
}

export function addDemoCategory(category) {
  const safeName = (category.name || category.label || '').trim();
  const baseSlug = category.slug ? slugify(category.slug) : slugify(safeName || `category-${demoStore.categories.length + 1}`);
  const existing = demoStore.categories.find((item) => item.slug === baseSlug);

  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const record = {
    _id: `demo-category-${demoStore.categories.length + 1}`,
    name: safeName || humanizeSlug(baseSlug) || `Category ${demoStore.categories.length + 1}`,
    slug: baseSlug,
    description: (category.description || '').trim(),
    icon: category.icon || '🛠️',
    image: category.image || '',
    isActive: category.isActive ?? true,
    productCount: 0,
    averagePrice: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  demoStore.categories.push(record);
  return record;
}

export function addDemoProduct(product) {
  const timestamp = new Date().toISOString();
  const nextIndex = demoStore.products.length + 1;

  let categoryRecord = null;

  if (product.categoryId) {
    categoryRecord = demoStore.categories.find((item) => item._id === product.categoryId);
  }

  const providedSlug = product.categorySlug ? slugify(product.categorySlug) : '';
  if (!categoryRecord && providedSlug) {
    categoryRecord = demoStore.categories.find((item) => item.slug === providedSlug);
  }

  const providedName = (product.category || product.categoryName || '').trim();
  if (!categoryRecord && providedName) {
    categoryRecord = demoStore.categories.find((item) => item.name.toLowerCase() === providedName.toLowerCase());
  }

  if (!categoryRecord) {
    categoryRecord = addDemoCategory({ name: providedName || humanizeSlug(providedSlug) });
  }

  const priceValue = Number(product.price ?? 0);
  const stockValue = Number(product.stock ?? 0);

  const record = {
    ...product,
    _id: `demo-product-${nextIndex}`,
    name: product.name?.trim() || `Product ${nextIndex}`,
    description: product.description || '',
    price: Number.isFinite(priceValue) ? priceValue : 0,
    category: categoryRecord.name,
    categoryId: categoryRecord._id,
    categorySlug: categoryRecord.slug,
    brand: product.brand || '',
    stock: Number.isFinite(stockValue) ? stockValue : 0,
    images: Array.isArray(product.images) && product.images.length
      ? product.images
      : product.image
        ? [product.image]
        : [],
    image: Array.isArray(product.images) && product.images.length
      ? product.images[0]
      : product.image || '',
    tags: Array.isArray(product.tags) ? product.tags : [],
    featured: Boolean(product.featured),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  demoStore.products.push(record);

  const categoryProducts = demoStore.products.filter((item) => item.categorySlug === categoryRecord.slug);
  const totalPrice = categoryProducts.reduce((sum, item) => sum + Number(item.price || 0), 0);
  categoryRecord.productCount = categoryProducts.length;
  categoryRecord.averagePrice = categoryRecord.productCount ? totalPrice / categoryRecord.productCount : 0;
  categoryRecord.updatedAt = timestamp;

  recomputeCategoryStats();

  return record;
}

export function addDemoOrder(order) {
  const nextIndex = demoStore.orders.length + 1;
  const timestamp = new Date().toISOString();
  const userId = order.user || demoStore.users[0]?._id || null;

  const newOrder = {
    ...order,
    _id: `demo-order-${nextIndex}`,
    user: userId,
    status: order.status || 'pending',
    items: (order.items || []).map(normaliseOrderItem),
    subtotal: Number(order.subtotal ?? 0),
    shipping: Number(order.shipping ?? 0),
    tax: Number(order.tax ?? 0),
    total: Number(order.total ?? 0),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  demoStore.orders.push(newOrder);
  return newOrder;
}

export function findDemoCategoryBySlug(slug) {
  const safeSlug = slugify(slug || '');
  return demoStore.categories.find((category) => category.slug === safeSlug);
}

export function updateDemoCategory(id, updates) {
  const category = demoStore.categories.find((item) => item._id === id || item.slug === id);
  if (!category) return null;

  if (updates.name) {
    category.name = updates.name;
  }
  if (updates.slug) {
    category.slug = slugify(updates.slug);
  }
  if (typeof updates.description !== 'undefined') {
    category.description = updates.description;
  }
  if (typeof updates.icon !== 'undefined') {
    category.icon = updates.icon;
  }
  if (typeof updates.image !== 'undefined') {
    category.image = updates.image;
  }
  category.updatedAt = new Date().toISOString();
  return category;
}

export function removeDemoCategory(id) {
  const index = demoStore.categories.findIndex((item) => item._id === id || item.slug === id);
  if (index === -1) return false;
  demoStore.categories.splice(index, 1);
  demoStore.products = demoStore.products.map((product) =>
    product.categoryId === id
      ? { ...product, category: 'General', categoryId: null, categorySlug: 'general' }
      : product
  );
  recomputeCategoryStats();
  return true;
}

export function updateDemoProduct(id, updates) {
  const product = demoStore.products.find((item) => item._id === id || item.id === id);
  if (!product) return null;

  if (updates.name) product.name = updates.name;
  if (typeof updates.description !== 'undefined') product.description = updates.description;
  if (typeof updates.price !== 'undefined') product.price = Number(updates.price) || 0;
  if (typeof updates.stock !== 'undefined') product.stock = Number(updates.stock) || 0;
  if (typeof updates.brand !== 'undefined') product.brand = updates.brand;
  if (typeof updates.featured !== 'undefined') product.featured = Boolean(updates.featured);
  if (typeof updates.images !== 'undefined') {
    product.images = Array.isArray(updates.images) ? updates.images : [];
    product.image = product.images[0] || '';
  }
  if (typeof updates.category !== 'undefined') product.category = updates.category;
  if (typeof updates.categoryId !== 'undefined') product.categoryId = updates.categoryId;
  if (typeof updates.categorySlug !== 'undefined') product.categorySlug = updates.categorySlug;
  product.updatedAt = new Date().toISOString();
  recomputeCategoryStats();
  return product;
}

export function removeDemoProduct(id) {
  const index = demoStore.products.findIndex((item) => item._id === id || item.id === id);
  if (index === -1) return false;
  demoStore.products.splice(index, 1);
  recomputeCategoryStats();
  return true;
}

export { recomputeCategoryStats };
