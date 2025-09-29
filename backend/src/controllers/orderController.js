import { Order } from '../models/Order.js';
import { ensureDatabaseConnection } from '../config/db.js';
import { config } from '../config/env.js';
import { addDemoOrder, demoStore } from '../utils/demoStore.js';

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

function resolveId(value) {
  if (!value) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toString' in value) {
    return value.toString();
  }
  return value;
}

function normaliseItems(items = []) {
  return items.map((item) => {
    const quantityValue = Number(item.quantity ?? item.qty ?? 1);
    const priceValue = Number(item.price ?? 0);
    return {
      product: item.product ?? item.productId ?? null,
      name: item.name ?? item.title ?? 'Item',
      price: Number.isFinite(priceValue) ? priceValue : 0,
      quantity: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1
    };
  });
}

function formatOrder(order, userIdOverride) {
  const source = typeof order?.toObject === 'function' ? order.toObject({ virtuals: false }) : order;
  if (!source) return null;

  const baseUserId = userIdOverride || source.user;

  return {
    id: resolveId(source._id || source.id),
    userId: resolveId(baseUserId),
    items: (source.items || []).map((item) => ({
      productId: resolveId(item.product ?? item.productId ?? null),
      title: item.name ?? item.title,
      price: Number(item.price ?? 0),
      qty: Number(item.quantity ?? item.qty ?? 0) || 1
    })),
    subtotal: Number(source.subtotal ?? 0),
    shipping: Number(source.shipping ?? 0),
    tax: Number(source.tax ?? 0),
    total: Number(source.total ?? 0),
    status: (source.status || 'pending').toUpperCase(),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

export async function createOrder(req, res) {
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  const items = normaliseItems(rawItems);

  if (!items.length) {
    return res.status(400).json({ message: 'Order items are required' });
  }

  const shippingValue = Number(req.body.shipping ?? 0);
  const taxValue = Number(req.body.tax ?? 0);
  const shipping = Number.isFinite(shippingValue) ? shippingValue : 0;
  const tax = Number.isFinite(taxValue) ? taxValue : 0;

  const subtotalCalculated = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = Number.isFinite(Number(req.body.subtotal)) ? Number(req.body.subtotal) : subtotalCalculated;
  const totalCandidate = Number.isFinite(Number(req.body.total))
    ? Number(req.body.total)
    : subtotal + shipping + tax;

  const statusCandidate = typeof req.body.status === 'string' ? req.body.status.toLowerCase() : 'pending';
  const status = ORDER_STATUSES.includes(statusCandidate) ? statusCandidate : 'pending';

  const preferDatabase = Boolean(config.mongoUri);
  const userId = resolveId(req.user._id || req.user.id);

  try {
    const dbReady = await ensureDatabaseConnection();
    if (dbReady) {
      const order = await Order.create({
        user: req.user._id,
        items,
        subtotal,
        shipping,
        tax,
        total: totalCandidate,
        status
      });
      return res.status(201).json(formatOrder(order, userId));
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const order = addDemoOrder({
      user: userId,
      items,
      subtotal,
      shipping,
      tax,
      total: totalCandidate,
      status
    });

    return res.status(201).json(formatOrder(order, userId));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create order' });
  }
}

export async function getOrders(req, res) {
  const preferDatabase = Boolean(config.mongoUri);
  const userId = resolveId(req.user._id || req.user.id);

  try {
    const dbReady = await ensureDatabaseConnection();
    if (dbReady) {
      const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
      return res.json(orders.map((order) => formatOrder(order, userId)));
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const orders = demoStore.orders
      .filter((order) => resolveId(order.user) === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(orders.map((order) => formatOrder(order, userId)));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load orders' });
  }
}

export async function getOrderById(req, res) {
  const { id } = req.params;
  const preferDatabase = Boolean(config.mongoUri);
  const userId = resolveId(req.user._id || req.user.id);

  try {
    const dbReady = await ensureDatabaseConnection();
    if (dbReady) {
      const order = await Order.findById(id);
      if (!order || resolveId(order.user) !== userId) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json(formatOrder(order, userId));
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const order = demoStore.orders.find(
      (item) => resolveId(item._id) === id && resolveId(item.user) === userId
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(formatOrder(order, userId));
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.status(500).json({ message: 'Unable to load order' });
  }
}
