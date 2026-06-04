import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config } from './config.js';
import analysisRoutes from './routes/analysis.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', analysisRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
