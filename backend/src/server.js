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

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
