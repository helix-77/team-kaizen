import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config()

import * as statusController from './controller/status.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// P1: Aggregated health check
app.get('/status', statusController.getStatus);

// Proxy helper
const proxy = (target, prefix) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${prefix}`]: '',
    },
    timeout: 60000,
    proxyTimeout: 60000,
    onError: (err, req, res) => {
      console.error(`[proxy] Error proxying ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error', details: err.message });
      }
    },
  });

// Route prefixes -> downstream services
app.use('/users', proxy(process.env.USER_SERVICE_URL || 'http://user-service:8001', '/users'));
app.use('/rentals', proxy(process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002', '/rentals'));
app.use('/analytics', proxy(process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003', '/analytics'));
app.use('/chat', proxy(process.env.AGENTIC_SERVICE_URL || 'http://agentic-service:8004', '/chat'));

app.listen(PORT, () => console.log(`api-gateway listening on :${PORT}`));
