import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, LoginFormData, RegisterFormData } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType extends AuthState {
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
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
      dispatch({ type: 'AUTH_START' });
      try {
        // Try localStorage first for faster initial load
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          dispatch({ type: 'AUTH_SUCCESS', payload: parsedUser });
        }

        // Verify with backend session
        const response = await authAPI.getCurrentUser();
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
        localStorage.setItem('user', JSON.stringify(response.user));
      } catch (error) {
        // Auth check failed - clear any stale data
        localStorage.removeItem('user');
        dispatch({ type: 'AUTH_FAILURE', payload: 'Not authenticated' });
      }
    };

    checkAuth();

    // Set up periodic session health checks
    const sessionCheckInterval = setInterval(async () => {
      if (state.isAuthenticated) {
        try {
          await authAPI.getCurrentUser();
        } catch (error) {
          // Session expired - logging out
          localStorage.removeItem('user');
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(sessionCheckInterval);
  }, [state.isAuthenticated]);

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

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
