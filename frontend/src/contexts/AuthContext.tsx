import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, LoginFormData, RegisterFormData } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  rateLimited: boolean;
  lastAuthCheck: number;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RATE_LIMITED' }
  | { type: 'RATE_LIMIT_RESET' };

interface AuthContextType extends AuthState {
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  emergencyReset: () => void;
}

// Helper function to get initial user state from localStorage
const getInitialUserState = (): { user: User | null; isAuthenticated: boolean } => {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return { user, isAuthenticated: true };
    }
  } catch (error) {
    console.warn('Failed to parse stored user data, clearing localStorage');
    localStorage.removeItem('user');
  }
  return { user: null, isAuthenticated: false };
};

const { user: initialUser, isAuthenticated: initialIsAuthenticated } = getInitialUserState();

const initialState: AuthState = {
  user: initialUser,
  isLoading: false,
  isAuthenticated: initialIsAuthenticated,
  error: null,
  rateLimited: false,
  lastAuthCheck: 0,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        lastAuthCheck: Date.now(),
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null,
        rateLimited: false,
        lastAuthCheck: Date.now(),
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
        lastAuthCheck: Date.now(),
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        lastAuthCheck: Date.now(),
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'RATE_LIMITED':
      return {
        ...state,
        isLoading: false,
        rateLimited: true,
        error: 'Too many requests - please wait before trying again',
        lastAuthCheck: Date.now(),
      };
    case 'RATE_LIMIT_RESET':
      return {
        ...state,
        rateLimited: false,
        error: null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      // Circuit breaker: prevent too frequent auth checks
      const now = Date.now();
      const timeSinceLastCheck = now - state.lastAuthCheck;
      const MIN_CHECK_INTERVAL = 5000; // 5 seconds minimum between checks

      if (state.rateLimited || (timeSinceLastCheck < MIN_CHECK_INTERVAL && state.lastAuthCheck > 0)) {
        console.log('⏳ Skipping auth check - too recent or rate limited');
        return;
      }

      dispatch({ type: 'AUTH_START' });
      
      // Try localStorage first for faster initial load
      const storedUser = localStorage.getItem('user');
      let parsedUser = null;
      
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
          dispatch({ type: 'AUTH_SUCCESS', payload: parsedUser });
        } catch (parseError) {
          console.warn('Invalid stored user data, clearing...');
          localStorage.removeItem('user');
        }
      }

      try {
        // Verify with backend session (with timeout protection)
        const response = await authAPI.getCurrentUser();
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
        localStorage.setItem('user', JSON.stringify(response.user));
      } catch (error: any) {
        // Handle rate limiting specifically
        if (error.response?.status === 429) {
          console.warn('🚦 Rate limited during auth check');
          dispatch({ type: 'RATE_LIMITED' });
          
          // Reset rate limit after delay
          setTimeout(() => {
            dispatch({ type: 'RATE_LIMIT_RESET' });
          }, 30000); // 30 seconds
          return;
        }

        // Auth check failed - but distinguish between network and auth errors
        if (error.response?.status === 401) {
          console.warn('🔐 Session invalid - user needs to login');
          localStorage.removeItem('user');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Please log in' });
        } else if (!error.response) {
          console.warn('⚠️ Network error during auth check - keeping any stored user');
          // Don't clear localStorage on network errors
          if (parsedUser) {
            // Keep the stored user for offline-like experience
            dispatch({ type: 'AUTH_FAILURE', payload: 'Connection issue - some features may be limited' });
          } else {
            dispatch({ type: 'AUTH_FAILURE', payload: 'Unable to verify authentication' });
          }
        } else {
          console.error('❌ Unexpected auth error:', error);
          localStorage.removeItem('user');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Authentication error' });
        }
      }
    };

    checkAuth();

    // Set up periodic session health checks (less aggressive)
    const sessionCheckInterval = setInterval(
      async () => {
        if (state.isAuthenticated && !state.rateLimited) {
          try {
            await authAPI.getCurrentUser();
          } catch (error: any) {
            // Handle rate limiting
            if (error.response?.status === 429) {
              console.warn('🚦 Session check rate limited - pausing checks');
              dispatch({ type: 'RATE_LIMITED' });
              return;
            }
            
            // Only logout on actual auth errors, not network errors
            if (error.response?.status === 401) {
              console.warn('🔐 Session expired - logging out');
              localStorage.removeItem('user');
              dispatch({ type: 'AUTH_LOGOUT' });
            } else {
              console.warn('⚠️ Session check failed (network issue), keeping user logged in:', error.message);
            }
          }
        }
      },
      15 * 60 * 1000
    ); // Check every 15 minutes (less aggressive)

    return () => clearInterval(sessionCheckInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (data: LoginFormData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authAPI.login(data);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      localStorage.removeItem('user');
      throw error;
    }
  };

  const register = async (data: RegisterFormData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authAPI.register(data);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      localStorage.removeItem('user');
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Silent logout error handling
    } finally {
      localStorage.removeItem('user');
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const emergencyReset = (): void => {
    console.log('🚨 Emergency reset triggered - clearing all auth state');
    
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionId');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Reset auth state
    dispatch({ type: 'AUTH_LOGOUT' });
    dispatch({ type: 'RATE_LIMIT_RESET' });
    dispatch({ type: 'CLEAR_ERROR' });
    
    // Force reload to clear any cached state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    emergencyReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
