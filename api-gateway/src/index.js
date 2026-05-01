import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config()

import * as statusController from './controller/status.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' },
});
app.use(limiter);

// Local routes (Gateway itself)
app.get('/status', express.json(), statusController.getStatus);

// Proxy helper - Modern HPM v3 compatible
const createServiceProxy = (pathFilter, target) => 
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter, // Only proxy requests starting with this path
    timeout: 60000,
    proxyTimeout: 60000,
    onError: (err, req, res) => {
      console.error(`[proxy] Error proxying ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error', details: err.message });
      }
    }
  });

// Route prefixes → downstream services
// We use app.use() on the root so HPM sees the full, unstripped path.
app.use(createServiceProxy('/users', process.env.USER_SERVICE_URL || 'http://user-service:8001'));
app.use(createServiceProxy('/rentals', process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002'));
app.use(createServiceProxy('/analytics', process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003'));
app.use(createServiceProxy('/chat', process.env.AGENTIC_SERVICE_URL || 'http://agentic-service:8004'));

app.listen(PORT, () => console.log(`api-gateway listening on :${PORT}`));
