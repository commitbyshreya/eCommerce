// backend/api/index.js
import serverless from 'serverless-http';
import app from '../app.js';
import { connectDatabase } from '../config/db.js';

// Reuse DB connection across invocations (good for serverless)
let dbReady;
async function ensureDb() {
  if (!dbReady) {
    dbReady = connectDatabase().catch(err => {
      dbReady = null; // allow retry on next invocation
      throw err;
    });
  }
  return dbReady;
}

export const config = {
  runtime: 'nodejs20.x' // or nodejs18.x; being explicit helps
};

export default async function handler(req, res) {
  await ensureDb();
  const wrapped = serverless(app);
  return wrapped(req, res);
}
