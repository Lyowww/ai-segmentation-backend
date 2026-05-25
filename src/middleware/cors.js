import cors from 'cors';

import { config } from '../config.js';

const allowedOrigins = () => {
  const { corsOrigin } = config;
  return Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin];
};

const isVercelAppHost = (host) =>
  typeof host === 'string' && (host.endsWith('.vercel.app') || host.endsWith('.vercel.sh'));

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowed = allowedOrigins();
    if (allowed.includes('*') || allowed.includes(origin)) {
      callback(null, true);
      return;
    }

    if (process.env.VERCEL) {
      try {
        const { host } = new URL(origin);
        if (isVercelAppHost(host)) {
          callback(null, true);
          return;
        }
      } catch {
        // ignore malformed Origin
      }
    }

    callback(null, false);
  },
  credentials: true
});
