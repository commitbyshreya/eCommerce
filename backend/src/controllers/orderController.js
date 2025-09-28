import { Order } from '../models/Order.js';
import { addDemoOrder, demoStore, isDatabaseConnected } from '../utils/demoStore.js';

export async function createOrder(req, res) {
  const { items = [], shipping = 0, tax = 0 } = req.body;

  if (!items.length) {
    return res.status(400).json({ message: 'Order items are required' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + Number(shipping) + Number(tax);

  try {
    if (isDatabaseConnected()) {
      const order = await Order.create({
        user: req.user._id,
        items,
        subtotal,
        shipping,
        tax,
        total
      });
      return res.status(201).json(order);
    }

    const order = addDemoOrder({
      user: req.user._id,
      items,
      subtotal,
      shipping,
      tax,
      total,
      status: 'pending'
    });

    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create order' });
  }
}

export async function getOrders(req, res) {
  try {
    if (isDatabaseConnected()) {
      const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
      return res.json(orders);
    }

    const orders = demoStore.orders.filter((order) => order.user === req.user._id);
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load orders' });
  }
}
