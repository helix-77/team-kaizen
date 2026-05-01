import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as userController from '../controller/user.js';

const router = express.Router();

// P2: POST /users/register
router.post('/register', userController.register);

// P2: POST /users/login
router.post('/login', userController.login);

// P2: GET /users/me
router.get('/me', verifyToken, userController.getMe);

// P6: GET /users/:id/discount
router.get('/:id/discount', userController.getDiscount);

export { getDiscountPercent } from '../controller/user.js';
export default router;
