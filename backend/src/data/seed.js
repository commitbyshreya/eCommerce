import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { demoOrders, demoProducts, demoUsers } from '../utils/demoData.js';

async function seed() {
  await connectDatabase();

  await User.deleteMany();
  await Product.deleteMany();
  await Order.deleteMany();

  const createdUsers = await User.create(demoUsers);
  const adminUser = createdUsers.find((user) => user.role === 'admin');

  const productDocs = await Product.create(demoProducts);

  await Order.create(
    demoOrders.map((order) => ({
      ...order,
      user: adminUser._id,
      items: order.items.map((item) => {
        const productDoc = productDocs.find((product) => product.name === item.name);
        return {
          ...item,
          product: productDoc?._id
        };
      })
    }))
  );

  console.log('Database seeded with demo data.');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed', error);
  process.exit(1);
});
