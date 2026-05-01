import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
dotenv.config()

import * as statusController from './controller/status.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// JWT Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    next();
  }
};

// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RentPi API Gateway',
      version: '1.0.0',
      description: 'Central API Gateway for RentPi Microservices',
    },
    servers: [{ url: 'http://localhost:8000' }],
  },
  apis: ['./src/index.js'], // In a real app, you'd point to all route files
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// P1: Aggregated health check
/**
 * @openapi
 * /status:
 *   get:
 *     description: Aggregated health check of all microservices
 *     responses:
 *       200:
 *         description: Returns health status
 */
app.get('/status', statusController.getStatus);

// Proxy helper
const proxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,
    onError: (err, req, res) => {
      console.error(`[proxy] Error proxying ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error', details: err.message });
      }
    },
  });

// Route prefixes → downstream services
app.use('/users', proxy(process.env.USER_SERVICE_URL || 'http://user-service:8001'));
app.use('/rentals', proxy(process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002'));
app.use('/analytics', proxy(process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003'));
app.use('/chat', proxy(process.env.AGENTIC_SERVICE_URL || 'http://agentic-service:8004'));

app.listen(PORT, () => console.log(`api-gateway listening on :${PORT}`));
