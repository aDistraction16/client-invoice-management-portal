import { Request, Response, NextFunction } from 'express';
import { User } from '../db/schema';

// Extend Express Request type to include session with userId and user object
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    userId: number;
  };
  user: User;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
  }

  // Add user object to request for convenience
  try {
    const { db } = await import('../db/connection');
    const { users } = await import('../db/schema');
    const { eq } = await import('drizzle-orm');

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Your session appears to be invalid',
      });
    }

    req.user = userResult[0];
    next();
  } catch (error) {
    console.error('❌ Error in auth middleware:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to verify user authentication',
    });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // This middleware allows both authenticated and non-authenticated requests
  next();
};

export const requireNoAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    return res.status(400).json({
      error: 'Already authenticated',
      message: 'Please log out first',
    });
  }
  next();
};
