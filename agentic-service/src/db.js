import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/rentpi_agentic';

export async function initDb() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[db] Connected to MongoDB');
  } catch (err) {
    console.error('[db] Connection error:', err.message);
    await new Promise(r => setTimeout(r, 2000));
    return initDb();
  }
}
