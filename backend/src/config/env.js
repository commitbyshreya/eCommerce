import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CLIENT_URLS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://e-commerce-join.vercel.app',
  'https://e-commerce-ivory-psi.vercel.app'
];

const clientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((value) => value.trim()).filter(Boolean)
  : DEFAULT_CLIENT_URLS;

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'toolkart-demo-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls
};
