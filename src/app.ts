import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOrigins, env } from './config/env';
import { requireClientHeader } from './middleware/clientHeader';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiters';
import routes from './routes';

const app = express();

app.set('trust proxy', env.TRUST_PROXY === 'true' ? 1 : false);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins().includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', requireClientHeader);
app.use('/api', apiLimiter);
app.use('/api', routes);

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable', code: 'NOT_FOUND' });
});

app.use(errorHandler);

export { app };