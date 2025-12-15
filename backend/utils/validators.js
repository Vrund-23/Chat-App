import { body, validationResult } from 'express-validator';

// Registration validation rules
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('mobile')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
  
  body('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  // Custom validator
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.mobile) {
      throw new Error('Either email or mobile number must be provided');
    }
    return true;
  }),
];

// Login validation rules
export const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or mobile number is required'),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
];

// Message validation rules
export const messageValidation = [
  body('receiverId')
    .trim()
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid receiver ID'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 5000 })
    .withMessage('Message content is too long'),
];

// Validate request with extensive debugging
export const validate = (req, res, next) => {
  console.log('\n========================================');
  console.log('🔍 VALIDATION MIDDLEWARE CALLED');
  console.log('========================================');
  console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('🔧 typeof next:', typeof next);
  console.log('❓ Is next a function?', typeof next === 'function');
  
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('❌ VALIDATION FAILED');
    console.log('Errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  
  console.log('✅ VALIDATION PASSED');
  console.log('⏭️  Calling next()...');
  
  if (typeof next !== 'function') {
    console.error('🚨 CRITICAL ERROR: next is not a function!');
    console.error('next value:', next);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: middleware misconfiguration'
    });
  }
  
  next();
  console.log('✅ next() called successfully');
  console.log('========================================\n');
};