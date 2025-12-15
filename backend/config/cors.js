// CORS Configuration
// This allows your backend to accept requests from multiple frontend URLs

// Default allowed origins (development)
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = () => {
  const origins = [...defaultOrigins];
  
  // Add CLIENT_URL from .env if exists
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }
  
  // Add PRODUCTION_URL from .env if exists
  if (process.env.PRODUCTION_URL) {
    origins.push(process.env.PRODUCTION_URL);
  }
  
  // Add multiple origins from ALLOWED_ORIGINS (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...envOrigins);
  }
  
  // Remove duplicates and filter out empty values
  return [...new Set(origins)].filter(Boolean);
};

// CORS options configuration
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      console.log(`✅ Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Cache preflight requests for 24 hours
};

// Socket.IO CORS configuration
export const socketCorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ Socket.IO CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
};

// Export function to get allowed origins (for logging)
export const getConfiguredOrigins = getAllowedOrigins;

export default { corsOptions, socketCorsOptions, getConfiguredOrigins };