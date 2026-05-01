import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import * as chatController from './controller/chatController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

app.get('/status', chatController.getStatus);
app.post('/chat', chatController.chat);
app.get('/chat/sessions', chatController.getSessions);
app.get('/chat/:sessionId/history', chatController.getHistory);
app.delete('/chat/:sessionId', chatController.deleteSession);

initDb().then(() => {
  app.listen(PORT, () => console.log(`agentic-service listening on port ${PORT}`));
});
