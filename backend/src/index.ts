import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import projectRoutes from './routes/projects';
import timeEntryRoutes from './routes/timeEntries';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import webhookRoutes from './routes/webhooks';
import paymentStatusRoutes from './routes/paymentStatus';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: retries => Math.min(retries * 50, 500),
  },
});

redisClient.on('error', err => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

// Connect to Redis with error handling
redisClient.connect().catch(err => {
  console.error('❌ Failed to connect to Redis:', err);
  process.exit(1);
});

// Rate limiting - more lenient for auth endpoints
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Increased to 1000 for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development environment
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Webhook routes MUST come before express.json() to preserve raw body
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: 'invoice:sess:',
      ttl: 86400 * 7, // 7 days in seconds
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    },
    name: 'invoice.sid',
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    redis: redisClient.isReady ? 'connected' : 'disconnected',
  });
});

// Session health check with lenient rate limiting
app.get('/api/session-check', rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requests per minute for session checks
  message: 'Session check rate limited - please wait',
  // Skip rate limiting for development environment
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
}), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({
        authenticated: false,
        sessionId: req.sessionID,
        userId: null,
        user: null,
      });
    }

    // Get user data for authenticated sessions
    const { db } = await import('./db/connection');
    const { users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (userResult.length === 0) {
      // User not found - clear session
      req.session.destroy(err => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.json({
        authenticated: false,
        sessionId: req.sessionID,
        userId: null,
        user: null,
      });
    }

    const user = userResult[0];
    res.json({
      authenticated: true,
      sessionId: req.sessionID,
      userId: req.session.userId,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        contactPerson: user.contactPerson,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({
      authenticated: false,
      error: 'Internal server error',
    });
  }
});

// Rate limit reset endpoint for development
if (process.env.NODE_ENV === 'development') {
  app.post('/api/debug/reset-rate-limit', (req, res) => {
    res.json({ message: 'Rate limit reset signal sent' });
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-status', paymentStatusRoutes);
// Note: webhooks already registered above before JSON middleware

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
