import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';

import connectDB from './config/database';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import inquiryRoutes from './routes/inquiry';
import userRoutes from './routes/user';
import optionsRoutes from './routes/options';
import studentRoutes from './routes/student';

// Load environment variables
dotenv.config();

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());

// Rate limiting
// Increased limits to handle more concurrent users
const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const generalLimiter = rateLimit({
  windowMs: isProduction
    ? parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') // 1 minute in production
    : 60 * 1000, // 1 minute in dev
  max: isProduction
    ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000') // 10000 requests per minute
    : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // 10000 in dev
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Allow bursts for better user experience
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Stricter limiter for auth endpoints to protect from brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100'), // Increased to 100 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CloudBlitz CRM API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/students', studentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export default app;
