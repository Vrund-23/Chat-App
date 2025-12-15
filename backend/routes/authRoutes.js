import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Simple routes without validation middleware (for debugging)
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;