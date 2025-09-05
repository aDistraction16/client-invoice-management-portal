import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Container, Link } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoginFormData } from '../../types';

const Login: React.FC = () => {
  const { login, error, isLoading, clearError, emergencyReset } = useAuth();
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      setShowError(false);
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      setShowError(true);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography 
            component="h1" 
            variant="h4" 
            align="center" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
          >
            💼 InvoiceFlow Pro
          </Typography>
          <Typography 
            component="h2" 
            variant="h5" 
            align="center" 
            gutterBottom
            sx={{ color: 'text.secondary', fontWeight: 'normal' }}
          >
            Welcome Back
          </Typography>

          {showError && error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters long',
                },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
            
            {/* Emergency Reset Button - Only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={emergencyReset}
                  sx={{ fontSize: '0.75rem' }}
                >
                  🚨 Emergency Reset (Dev Only)
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
