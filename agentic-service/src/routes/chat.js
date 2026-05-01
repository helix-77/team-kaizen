import express from 'express';
import * as chatController from '../controller/chat.js';

const router = express.Router();

// README endpoints after gateway strips /chat
router.post('/', chatController.sendMessage);
router.get('/sessions', chatController.getSessions);
router.get('/:sessionId/history', chatController.getSessionHistory);
router.delete('/:sessionId', chatController.deleteSession);

// Backward-compatible aliases from the old implementation.
router.post('/message', chatController.sendMessage);
router.get('/history/:conversationId', chatController.getHistory);
router.get('/conversations/:userId', chatController.getConversations);

export default router;
