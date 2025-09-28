import mongoose from 'mongoose';
import { config } from './env.js';

const MONGO_FALLBACK = 'mongodb://127.0.0.1:27017/toolkart';

export async function connectDatabase() {
  const uri = config.mongoUri || MONGO_FALLBACK;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB connected at ${uri}`);
  } catch (error) {
    console.warn('MongoDB connection failed, continuing in demo mode.');
    console.warn(error.message);
  }
}
