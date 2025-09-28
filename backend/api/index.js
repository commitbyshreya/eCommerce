// backend/api/index.js
import serverless from 'serverless-http';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

// Reuse DB connection across invocations (good for serverless)
let dbReady;
async function ensureDb() {
  if (!dbReady) {
    dbReady = connectDatabase().catch(err => {
      console.error('Database connection failed:', err.message);
      dbReady = null; // allow retry on next invocation
      // Don't throw, let the app run without DB for demo mode
    });
  }
  return dbReady;
}

export default async function handler(req, res) {
  try {
    // Ensure database connection (non-blocking)
    await ensureDb();
    
    // Wrap the Express app with serverless-http
    const wrapped = serverless(app);
    return await wrapped(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
