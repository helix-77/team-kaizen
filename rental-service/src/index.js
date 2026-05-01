import express from 'express';
import cors from 'cors';
import rentalsRouter from './routes/rentals.js';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
dotenv.config()

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// P1: Health check
app.get('/status', (req, res) => {
  res.json({ service: 'rental-service', status: 'OK' });
});

app.use('/', rentalsRouter);

app.listen(PORT, () => console.log(`rental-service listening on :${PORT}`));
