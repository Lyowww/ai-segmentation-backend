import app from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  console.log(`[recypic-server] listening on http://localhost:${config.port}`);
});

const shutdown = (signal) => {
  console.log(`[recypic-server] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
