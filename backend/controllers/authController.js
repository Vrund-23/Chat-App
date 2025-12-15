import User from '../models/User.js';
import { generateToken } from '../utils/tokenUtils.js';

// Register
export const register = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    console.log('📝 Register request:', { name, email, mobile, hasPassword: !!password });

    // Validation
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name and password are required'
      });
    }

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Either email or mobile number is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check existing user
    const query = [];
    if (email) query.push({ email });
    if (mobile) query.push({ mobile });

    if (query.length > 0) {
      const existingUser = await User.findOne({ $or: query });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or mobile already exists'
        });
      }
    }

    // Create user
    const userData = { name, password };
    if (email) userData.email = email;
    if (mobile) userData.mobile = mobile;

    const user = await User.create(userData);
    const token = generateToken(user._id);

    console.log('✅ User created successfully:', user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        isOnline: user.isOnline,
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/mobile and password are required'
      });
    }

    // Check if email or mobile
    const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier);
    const isMobile = /^[0-9]{10}$/.test(identifier);

    if (!isEmail && !isMobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email or mobile number'
      });
    }

    // Find user
    const user = await User.findOne({
      [isEmail ? 'email' : 'mobile']: identifier
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    console.log('✅ User logged in:', user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        isOnline: user.isOnline,
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

// Get Me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      }
    });
  } catch (error) {
    console.error('❌ GetMe error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};