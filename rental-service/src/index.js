import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as rentalController from './controller/rentalController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/status', rentalController.getStatus);

// Endpoints
app.get('/rentals/products', rentalController.getProducts);
app.get('/rentals/products/:id', rentalController.getProductById);
app.get('/rentals/products/:id/availability', rentalController.getAvailability);
app.get('/rentals/kth-busiest-date', rentalController.getKthBusiestDate);
app.get('/rentals/users/:id/top-categories', rentalController.getTopCategories);
app.get('/rentals/products/:id/free-streak', rentalController.getLongestFreeStreak);
app.get('/rentals/merged-feed', rentalController.getMergedFeed);

app.listen(PORT, () => {
  console.log(`rental-service listening on port ${PORT}`);
});
