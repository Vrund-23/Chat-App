import express from 'express';
import {
  sendMessage,
  getMessages,
  getConversations,
  markAsDelivered,
  markAsRead,
  deleteMessage,
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getMessages);
router.put('/delivered/:userId', protect, markAsDelivered);
router.put('/read/:userId', protect, markAsRead);
router.delete('/:messageId', protect, deleteMessage);

export default router;