import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { demoOrders, demoProducts, demoUsers } from './demoData.js';

const now = new Date().toISOString();

const hashedUsers = demoUsers.map((user, index) => ({
  ...user,
  _id: `demo-user-${index + 1}`,
  password: bcrypt.hashSync(user.password, 10),
  createdAt: now,
  updatedAt: now
}));

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
  products: demoProducts.map((product, index) => ({
    ...product,
    _id: `demo-product-${index + 1}`,
    createdAt: now,
    updatedAt: now
  })),
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

export function isDatabaseConnected() {
  return mongoose.connection?.readyState === 1;
}

export const demoStore = demoState;

export function findDemoUserByEmail(email) {
  return demoStore.users.find((user) => user.email === email.toLowerCase());
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

export function addDemoOrder(order) {
  const nextIndex = demoStore.orders.length + 1;
  const newOrder = {
    ...order,
    _id: `demo-order-${nextIndex}`,
    status: order.status || 'pending',
    items: (order.items || []).map(normaliseOrderItem),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  demoStore.orders.push(newOrder);
  return newOrder;
}
