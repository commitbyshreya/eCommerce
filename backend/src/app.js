import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import { config } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { me } from './controllers/authController.js';
import { ensureUploadsDir } from './utils/fileStorage.js';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = config.allowAllClients
  ? []
  : [...config.clientUrls, /\.vercel\.app$/];

app.use(cors({
  origin(origin, callback) {
    // allow same-origin / server-to-server / tools
    if (!origin || config.allowAllClients) return callback(null, true);

    const ok = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    return ok ? callback(null, true) : callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

const uploadsDir = ensureUploadsDir();
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'ToolKart API is running' });
});

app.get('/api/me', authenticate, me);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
