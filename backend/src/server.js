// server.js  (used for local dev only)
import http from 'http';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { config } from './config/env.js';

const server = http.createServer(app);

async function start() {
  await connectDatabase();
  server.listen(config.port, () => {
    console.log(`ToolKart API listening on port ${config.port}`);
  });
}

// Only run the server when NOT on Vercel
if (process.env.VERCEL !== '1') {
  start().catch((error) => {
    console.error('Failed to start server');
    console.error(error);
    process.exit(1);
  });
}

export default server; // optional; not used by Vercel
