import express from 'express';
import * as rentalsController from '../controller/rentals.js';

const router = express.Router();

// README endpoints
router.get('/products/:id/availability', rentalsController.getAvailability);
router.get('/products/:id/free-streak', rentalsController.getFreeStreak);
router.get('/products/:id', rentalsController.getProductById);
router.get('/products', rentalsController.getProducts);
router.get('/kth-busiest-date', rentalsController.getKthBusiestDate);
router.get('/users/:id/top-categories', rentalsController.getTopCategories);
router.get('/merged-feed', rentalsController.getMergedFeed);

// Backward-compatible aliases from the old implementation.
router.get('/devices', rentalsController.getProducts);
router.get('/devices/:id', rentalsController.getProductById);

// ── P4: Paginated listings — GET /rentals/listings ──
router.get('/listings', rentalsController.getListings);

// ── P5: Search & Filter — GET /rentals/search ──
router.get('/search', rentalsController.searchDevices);

// ── P7: Merge Overlapping Intervals — POST /rentals/merge-periods ──
router.post('/merge-periods', rentalsController.mergePeriods);

// ── P8: Cheapest K — GET /rentals/cheapest?k=5 ──
router.get('/cheapest', rentalsController.getCheapest);

// ── P9: Most Expensive K — GET /rentals/expensive?k=5 ──
router.get('/expensive', rentalsController.getExpensive);

// ── P10: Device Dependencies — GET /rentals/dependencies/:deviceId ──
router.get('/dependencies/:deviceId', rentalsController.getDependencies);

export default router;
