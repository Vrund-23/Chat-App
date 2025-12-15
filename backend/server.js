import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { corsOptions, socketCorsOptions, getConfiguredOrigins } from './config/cors.js';

dotenv.config();

console.log('🚀 Starting server...');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { initializeSocket } from './socket/socketHandler.js';

const app = express();
const httpServer = createServer(app);

// Apply CORS with configuration
// app.use(cors()); // not recommended for production
// app.options('*', cors()); // enable pre-flight for all routes

app.use(cors(corsOptions));

// Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: socketCorsOptions,
});

initializeSocket(io);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    allowedOrigins: getConfiguredOrigins(),
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin || 'No origin header',
    allowedOrigins: getConfiguredOrigins(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Your origin is not allowed to access this resource',
      origin: req.headers.origin,
      hint: 'Contact the administrator to whitelist your domain'
    });
  }
  
  // Handle other errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  const allowedOrigins = getConfiguredOrigins();
  
  console.log(`
╔═══════════════════════════════════════════════════╗
║   ✅ Server Running Successfully                  ║
╠═══════════════════════════════════════════════════╣
║   Port:        ${PORT}                            
║   URL:         http://localhost:${PORT}           
║   Environment: ${process.env.NODE_ENV || 'development'}
║   MongoDB:     ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
╠═══════════════════════════════════════════════════╣
║   CORS Configuration:                              ║
║   ${allowedOrigins.length} origins allowed                         
╚═══════════════════════════════════════════════════╝
  `);
  
  console.log('\n📋 Allowed Origins:');
  allowedOrigins.forEach((origin, index) => {
    console.log(`   ${index + 1}. ${origin}`);
  });
  
  console.log('\n🚀 Ready to accept requests!\n');
});