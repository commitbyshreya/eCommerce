import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { demoStore, isDatabaseConnected } from '../utils/demoStore.js';

function buildDemoDashboard() {
  const totalSales = demoStore.orders.reduce((sum, order) => sum + order.total, 0);
  const ordersToday = demoStore.orders.filter((order) => {
    const created = new Date(order.createdAt);
    const today = new Date();
    return (
      created.getDate() === today.getDate() &&
      created.getMonth() === today.getMonth() &&
      created.getFullYear() === today.getFullYear()
    );
  }).length;

  const pendingOrders = demoStore.orders.filter((order) => order.status === 'pending').length;
  const lowStock = demoStore.products.filter((product) => product.stock < 10).length;

  return {
    totalSales,
    ordersToday,
    pendingOrders,
    stockAlerts: lowStock,
    salesTrends: demoStore.orders.map((order, index) => ({
      label: `Week ${index + 1}`,
      value: Math.round(order.total)
    })),
    products: demoStore.products.slice(0, 6)
  };
}

export async function getDashboard(req, res) {
  try {
    if (!isDatabaseConnected()) {
      return res.json(buildDemoDashboard());
    }

    const totalSalesAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const ordersToday = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    const stockAlerts = await Product.countDocuments({ stock: { $lt: 10 } });

    const salesTrends = await Order.aggregate([
      {
        $group: {
          _id: { $week: '$createdAt' },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          _id: 0,
          label: { $concat: ['Week ', { $toString: '$_id' }] },
          value: '$total'
        }
      }
    ]);

    const products = await Product.find().sort({ createdAt: -1 }).limit(8);

    return res.json({
      totalSales,
      ordersToday,
      pendingOrders,
      stockAlerts,
      salesTrends,
      products
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load admin dashboard' });
  }
}
