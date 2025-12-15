import express from 'express';
import {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { messageValidation, validate } from '../utils/validators.js';

const router = express.Router();

// All routes are protected
router.post('/', protect, messageValidation, validate, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getMessages);
router.put('/read/:userId', protect, markAsRead);

export default router;