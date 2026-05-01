import express from 'express';
import * as analyticsController from '../controller/analytics.js';

const router = express.Router();

// ── P11: Peak Rental Window — GET /analytics/peak-window?days=7 ──
router.get('/peak-window', analyticsController.getPeakWindow);

// README endpoints
router.get('/surge-days', analyticsController.getSurgeDays);
router.get('/recommendations', analyticsController.getRecommendations);

// ── P12: Time-Series Aggregation — GET /analytics/trends?period=monthly ──
router.get('/trends', analyticsController.getTrends);

// ── P13: Price Spikes — GET /analytics/price-spikes ──
router.get('/price-spikes', analyticsController.getPriceSpikes);

// ── P14: Summary Statistics — GET /analytics/summary ──
router.get('/summary', analyticsController.getSummary);

export default router;
