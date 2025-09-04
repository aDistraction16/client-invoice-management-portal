import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import { eq } from 'drizzle-orm';
import db from '../db/connection';
import { users } from '../db/schema';
import { validateBody } from '../middleware/validation';
import { requireAuth, requireNoAuth } from '../middleware/auth';

const router = Router();

// Auth-specific rate limiting (more lenient)
const authLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 20, // 20 auth requests per minute
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development environment
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  companyName: Joi.string().optional(),
  contactPerson: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Register new user
router.post(
  '/register',
  requireNoAuth,
  validateBody(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, companyName, contactPerson } = req.body;

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists',
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          companyName,
          contactPerson,
        })
        .returning({
          id: users.id,
          email: users.email,
          companyName: users.companyName,
          contactPerson: users.contactPerson,
        });

      // Set session
      req.session.userId = newUser[0].id;

      res.status(201).json({
        message: 'User registered successfully',
        user: newUser[0],
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration',
      });
    }
  }
);

// Login user
router.post(
  '/login',
  requireNoAuth,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (user.length === 0) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user[0].passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Set session
      req.session.userId = user[0].id;

      res.json({
        message: 'Login successful',
        user: {
          id: user[0].id,
          email: user[0].email,
          companyName: user[0].companyName,
          contactPerson: user[0].contactPerson,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  }
);

// Logout user
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout',
      });
    }

    res.clearCookie('invoice.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', authLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;

    if (typeof userId !== 'number') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User session is invalid',
      });
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        companyName: users.companyName,
        contactPerson: users.contactPerson,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User session is invalid',
      });
    }

    res.json({ user: user[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while fetching user data',
    });
  }
});

export default router;
