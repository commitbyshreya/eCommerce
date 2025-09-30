import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import {
  demoStore,
  findDemoUserById,
  isDatabaseConnected
} from '../utils/demoStore.js';
import { humanizeSlug, slugify } from '../utils/slugify.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toPlain(value) {
  return typeof value?.toObject === 'function' ? value.toObject({ virtuals: false }) : value;
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function getWeekInfo(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { year: 0, week: 0 };
  }
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  return { year: target.getFullYear(), week };
}

function computeSeriesFromOrders(orders, period, limit) {
  const buckets = new Map();

  orders.forEach((order) => {
    const created = new Date(order.createdAt || order.updatedAt || Date.now());
    if (Number.isNaN(created.getTime())) return;

    let key;
    let label;
    let sortKey;

    if (period === 'weekly') {
      const { year, week } = getWeekInfo(created);
      if (!year || !week) return;
      key = `${year}-W${week}`;
      label = `W${pad(week)} ${year}`;
      sortKey = year * 100 + week;
    } else if (period === 'monthly') {
      const month = created.getMonth();
      const year = created.getFullYear();
      key = `${year}-${month + 1}`;
      label = `${MONTH_NAMES[month]} ${year}`;
      sortKey = year * 100 + (month + 1);
    } else if (period === 'quarterly') {
      const month = created.getMonth();
      const year = created.getFullYear();
      const quarter = Math.floor(month / 3) + 1;
      key = `${year}-Q${quarter}`;
      label = `Q${quarter} ${year}`;
      sortKey = year * 10 + quarter;
    } else {
      return;
    }

    const record = buckets.get(key) || { label, value: 0, sortKey };
    record.value += safeNumber(order.total);
    buckets.set(key, record);
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-limit)
    .map((entry) => ({ label: entry.label, value: Number(entry.value.toFixed(2)) }));
}

function formatOrder(order, userOverride) {
  const source = toPlain(order) || {};
  const user = toPlain(userOverride) || toPlain(source.user) || {};

  const items = (source.items || []).map((item) => {
    const entry = toPlain(item) || {};
    return {
      name: entry.name || entry.title || 'Item',
      price: safeNumber(entry.price),
      quantity: Number(entry.quantity ?? entry.qty ?? 1) || 1
    };
  });

  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: source._id?.toString?.() ?? source.id ?? null,
    customer: {
      id: user._id?.toString?.() ?? user.id ?? null,
      name: user.name || 'Guest',
      email: user.email || ''
    },
    total: safeNumber(source.total),
    status: (source.status || '').toLowerCase(),
    createdAt: source.createdAt || source.updatedAt || null,
    itemsCount,
    items
  };
}

function formatProduct(product) {
  const source = toPlain(product) || {};
  return {
    id: source._id?.toString?.() ?? source.id ?? null,
    name: source.name,
    price: safeNumber(source.price),
    stock: Number(source.stock ?? 0) || 0,
    category: source.category || humanizeSlug(source.categorySlug || ''),
    categorySlug: source.categorySlug || slugify(source.category || ''),
    featured: Boolean(source.featured),
    updatedAt: source.updatedAt || source.createdAt || null
  };
}

function formatCategorySummary(category, stats = {}) {
  const source = toPlain(category) || {};
  const slug = source.slug || slugify(source.name || '');
  return {
    id: source._id?.toString?.() ?? source.id ?? null,
    name: source.name || humanizeSlug(slug),
    slug,
    productCount: Number(stats.productCount ?? source.productCount ?? 0) || 0,
    averagePrice: Number(stats.averagePrice ?? source.averagePrice ?? 0) || 0,
    lowStock: Number(stats.lowStock ?? source.lowStock ?? 0) || 0
  };
}

function buildDemoDashboard() {
  const orders = demoStore.orders.slice();
  const products = demoStore.products.slice();
  const categories = demoStore.categories.slice();

  const totalSales = orders.reduce((sum, order) => sum + safeNumber(order.total), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders ? totalSales / totalOrders : 0;

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const ordersToday = orders.filter((order) => {
    const created = new Date(order.createdAt);
    return created >= startToday && created < endToday;
  }).length;

  const pendingOrders = orders.filter((order) => (order.status || '').toLowerCase() === 'pending').length;
  const stockAlerts = products.filter((product) => Number(product.stock || 0) < 10).length;

  const weeklySales = computeSeriesFromOrders(orders, 'weekly', 8);
  const monthlySales = computeSeriesFromOrders(orders, 'monthly', 6);
  const quarterlySales = computeSeriesFromOrders(orders, 'quarterly', 4);

  const ordersView = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map((order) => formatOrder(order, findDemoUserById(order.user)));

  const productsView = products
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 12)
    .map(formatProduct);

  const categoriesView = categories.map((category) => {
    const relatedProducts = products.filter((product) => product.categorySlug === category.slug);
    const productCount = relatedProducts.length;
    const averagePrice = productCount
      ? relatedProducts.reduce((sum, product) => sum + safeNumber(product.price), 0) / productCount
      : 0;
    const lowStock = relatedProducts.filter((product) => Number(product.stock || 0) < 10).length;

    return {
      id: category._id,
      name: category.name,
      slug: category.slug,
      productCount,
      averagePrice,
      lowStock
    };
  });

  return {
    summary: {
      totalSales,
      totalOrders,
      averageOrderValue,
      ordersToday,
      pendingOrders,
      stockAlerts
    },
    analytics: {
      weeklySales,
      monthlySales,
      quarterlySales
    },
    orders: ordersView,
    products: productsView,
    categories: categoriesView
  };
}

export async function getDashboard(_req, res) {
  try {
    if (!isDatabaseConnected()) {
      return res.json(buildDemoDashboard());
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      metricsAgg,
      ordersTodayCount,
      pendingOrdersCount,
      stockAlertsCount,
      recentOrders,
      products,
      categoriesDocs,
      categoryStats,
      weeklyAgg,
      monthlyAgg,
      quarterlyAgg
    ] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$total' }
          }
        }
      ]),
      Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Order.countDocuments({ status: 'pending' }),
      Product.countDocuments({ stock: { $lt: 10 } }),
      Order.find()
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Product.find().sort({ updatedAt: -1 }).limit(12).lean(),
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
      ]),
      Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              week: { $week: '$createdAt' }
            },
            total: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': -1, '_id.week': -1 } },
        { $limit: 8 },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            week: '$_id.week',
            total: '$total'
          }
        }
      ]),
      Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            total: '$total'
          }
        }
      ]),
      Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              quarter: {
                $ceil: {
                  $divide: [{ $month: '$createdAt' }, 3]
                }
              }
            },
            total: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': -1, '_id.quarter': -1 } },
        { $limit: 4 },
        { $sort: { '_id.year': 1, '_id.quarter': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            quarter: '$_id.quarter',
            total: '$total'
          }
        }
      ])
    ]);

    const metrics = metricsAgg[0] || {};
    const totalSales = safeNumber(metrics.totalSales);
    const totalOrders = safeNumber(metrics.totalOrders);
    const averageOrderValue = totalOrders ? safeNumber(metrics.averageOrderValue) : 0;

    const weeklySales = weeklyAgg.map((entry) => ({
      label: `W${pad(entry.week)} ${entry.year}`,
      value: safeNumber(entry.total)
    }));

    const monthlySales = monthlyAgg.map((entry) => ({
      label: `${MONTH_NAMES[(entry.month - 1 + 12) % 12]} ${entry.year}`,
      value: safeNumber(entry.total)
    }));

    const quarterlySales = quarterlyAgg.map((entry) => ({
      label: `Q${entry.quarter} ${entry.year}`,
      value: safeNumber(entry.total)
    }));

    const statsMap = new Map(
      categoryStats.filter((entry) => entry._id).map((entry) => [entry._id, entry])
    );

    const categorySummaries = categoriesDocs.map((category) =>
      formatCategorySummary(category, statsMap.get(category.slug) || {})
    );

    const knownSlugs = new Set(categorySummaries.map((category) => category.slug));
    categoryStats.forEach((entry) => {
      if (!entry._id || knownSlugs.has(entry._id)) return;
      categorySummaries.push(
        formatCategorySummary(
          {
            name: humanizeSlug(entry._id),
            slug: entry._id
          },
          entry
        )
      );
    });

    return res.json({
      summary: {
        totalSales,
        totalOrders,
        averageOrderValue,
        ordersToday: ordersTodayCount,
        pendingOrders: pendingOrdersCount,
        stockAlerts: stockAlertsCount
      },
      analytics: {
        weeklySales,
        monthlySales,
        quarterlySales
      },
      orders: recentOrders.map((order) => formatOrder(order)),
      products: products.map(formatProduct),
      categories: categorySummaries
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ message: 'Unable to load admin dashboard' });
  }
}
