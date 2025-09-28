import serverless from 'serverless-http';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

let handler;
let dbPromise;

async function ensureBootstrap() {
  if (!dbPromise) {
    dbPromise = connectDatabase().catch((error) => {
      console.warn('Vercel bootstrap DB connection failed:', error.message);
    });
  }
  if (!handler) {
    handler = serverless(app);
  }
  await dbPromise;
}

export default async function vercelHandler(req, res) {
  await ensureBootstrap();
  return handler(req, res);
}

export const config = {
  api: {
    bodyParser: false
  }
};
