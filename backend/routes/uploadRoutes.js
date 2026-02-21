import express from 'express';
import upload from '../utils/fileUpload.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Upload general file (media messages)
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const filePath = `/uploads/${req.file.filename}`;
    
    res.status(200).json({
      message: 'File uploaded successfully',
      filePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error during upload' });
  }
});

// @desc    Upload profile picture
// @route   POST /api/upload/profile-picture
// @access  Private
router.post('/profile-picture', protect, upload.single('profilePicture'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';
    const filePath = `/uploads/${req.file.filename}`;
    const fullUrl = `${API_BASE}${filePath}`;

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      filePath,
      fullUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, message: 'Server Error during upload' });
  }
});

export default router;
