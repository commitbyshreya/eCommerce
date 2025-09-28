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

export async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!config.mongoUri) {
    return false;
  }

  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve) => {
      mongoose.connection.once('connected', () => resolve(true));
      mongoose.connection.once('error', () => resolve(false));
    });
  }

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB reconnected on demand');
    return true;
  } catch (error) {
    console.warn('MongoDB reconnection failed');
    console.warn(error.message);
    return false;
  }
}
