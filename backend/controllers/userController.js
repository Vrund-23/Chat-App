import User from '../models/User.js';

// @desc    Get all users except current user
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ isOnline: -1, lastSeen: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
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
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users by name, email, or mobile
// @route   GET /api/users/search/:query
// @access  Private
export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.params;

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      })),
    });
  } catch (error) {
    next(error);
  }
};