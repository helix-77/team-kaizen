import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDb } from './db.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// P1: Health check
app.get('/status', (req, res) => {
  res.json({ service: 'agentic-service', status: 'OK' });
});

// All chat routes — gateway strips /chat prefix before forwarding here
app.use('/', chatRouter);

initDb().then(() => {
  app.listen(PORT, () => console.log(`agentic-service listening on :${PORT}`));
});
