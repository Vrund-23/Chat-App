import express from 'express';
import { getUsers, getUserById, searchUsers, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/search/:query', protect, searchUsers);
router.put('/profile', protect, updateProfile);
router.get('/:id', protect, getUserById);

export default router;