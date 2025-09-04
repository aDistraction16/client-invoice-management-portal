import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include session with userId
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    userId: number;
  };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // This middleware allows both authenticated and non-authenticated requests
  next();
};

export const requireNoAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    return res.status(400).json({
      error: 'Already authenticated',
      message: 'Please log out first'
    });
  }
  next();
};
