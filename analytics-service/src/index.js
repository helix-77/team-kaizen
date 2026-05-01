import express from 'express';
import cors from 'cors';
import analyticsRouter from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());

// P1: Health check
app.get('/status', (req, res) => {
  res.json({ service: 'analytics-service', status: 'OK' });
});

app.use('/', analyticsRouter);

app.listen(PORT, () => console.log(`analytics-service listening on :${PORT}`));
