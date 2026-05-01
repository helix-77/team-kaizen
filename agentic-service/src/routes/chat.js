import express from 'express';
import * as chatController from '../controller/chatController.js';

const router = express.Router();

// P15: RentPi AI Assistant — POST /chat (gateway strips /chat prefix)
router.post('/', chatController.chat);

// P16: Chat That Remembers
router.get('/sessions', chatController.getSessions);
router.get('/:sessionId/history', chatController.getHistory);
router.delete('/:sessionId', chatController.deleteSession);

export default router;
