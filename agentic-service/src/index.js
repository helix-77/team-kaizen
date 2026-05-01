import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import dotenv from 'dotenv'
dotenv.config()

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

// P1: Health check
app.get('/status', async (req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res.json({
    service: 'agentic-service',
    status: mongoOk ? 'OK' : 'DEGRADED',
    mongo: mongoOk ? 'connected' : 'disconnected',
  });
});

app.use('/', chatRouter);

// Connect to MongoDB then start server
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/agentic';

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[db] MongoDB connected');
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    // Retry after 3s
    await new Promise((r) => setTimeout(r, 3000));
    return start();
  }
  app.listen(PORT, () => console.log(`agentic-service listening on :${PORT}`));
}

start();
