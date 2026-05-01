import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import usersRouter from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());

// P1: Health check
app.get('/status', (req, res) => {
  res.json({ service: 'user-service', status: 'OK' });
});

app.use('/', usersRouter);


initDb().then(() => {
  app.listen(PORT, () => console.log(`user-service listening on :${PORT}`));
});
