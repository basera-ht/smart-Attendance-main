import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import employeeRoutes from './src/routes/employeeRoutes.js';
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import taskRoutes from './src/routes/taskRoutes.js';
import leaveRoutes from './src/routes/leaveRoutes.js';
import { errorHandler } from './src/middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - more lenient for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs (login, register, etc.)
  message: 'Too many authentication requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for other routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth rate limiter to auth routes
app.use('/api/auth', authLimiter);

// Apply general rate limiter to all other API routes (excluding auth)
app.use('/api', (req, res, next) => {
  // Skip rate limiting for auth routes (already handled above)
  if (req.path.startsWith('/auth')) {
    return next();
  }
  // Apply rate limiter for all other routes
  return apiLimiter(req, res, next);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', reportRoutes); // Alias for analytics endpoints
app.use('/api/tasks', taskRoutes);
app.use('/api/leaves', leaveRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Corporate Smart Attendance System API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;