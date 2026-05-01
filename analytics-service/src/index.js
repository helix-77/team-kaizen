import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as analyticsController from './controller/analyticsController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());

app.get('/status', analyticsController.getStatus);
app.get('/analytics/peak-window', analyticsController.getPeakWindow);
app.get('/analytics/surge-days', analyticsController.getSurgeDays);
app.get('/analytics/recommendations', analyticsController.getRecommendations);

app.listen(PORT, () => console.log(`analytics-service listening on port ${PORT}`));
