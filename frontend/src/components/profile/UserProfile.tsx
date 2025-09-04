import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileFormData {
  email: string;
  companyName: string;
  contactPerson: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const { control: profileControl, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm<ProfileFormData>({
    defaultValues: {
      email: user?.email || '',
      companyName: user?.companyName || '',
      contactPerson: user?.contactPerson || '',
    },
  });

  const { control: passwordControl, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setProfileSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // Note: This would need a profile update endpoint in the backend
      // For now, we'll show a success message
      setSuccess('Profile updated successfully! (Note: Backend endpoint needed)');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordSubmitting(true);
      setError(null);
      setSuccess(null);

      if (data.newPassword !== data.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      // Note: This would need a password change endpoint in the backend
      setSuccess('Password changed successfully! (Note: Backend endpoint needed)');
      resetPassword();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3 }}>
        {/* Profile Information */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6">Profile Information</Typography>
            </Box>
            
            <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
              <Box sx={{ display: 'grid', gap: 2, maxWidth: 400 }}>
                <Controller
                  name="email"
                  control={profileControl}
                  rules={{ 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!profileErrors.email}
                      helperText={profileErrors.email?.message}
                    />
                  )}
                />

                <Controller
                  name="companyName"
                  control={profileControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Company Name"
                      fullWidth
                      error={!!profileErrors.companyName}
                      helperText={profileErrors.companyName?.message}
                    />
                  )}
                />

                <Controller
                  name="contactPerson"
                  control={profileControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Person"
                      fullWidth
                      error={!!profileErrors.contactPerson}
                      helperText={profileErrors.contactPerson?.message}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={profileSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={profileSubmitting}
                  sx={{ width: 'fit-content' }}
                >
                  {profileSubmitting ? 'Saving...' : 'Save Profile'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Change Password</Typography>
            </Box>
            
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
              <Box sx={{ display: 'grid', gap: 2, maxWidth: 400 }}>
                <Controller
                  name="currentPassword"
                  control={passwordControl}
                  rules={{ required: 'Current password is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Current Password"
                      type="password"
                      fullWidth
                      error={!!passwordErrors.currentPassword}
                      helperText={passwordErrors.currentPassword?.message}
                    />
                  )}
                />

                <Controller
                  name="newPassword"
                  control={passwordControl}
                  rules={{ 
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="New Password"
                      type="password"
                      fullWidth
                      error={!!passwordErrors.newPassword}
                      helperText={passwordErrors.newPassword?.message}
                    />
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={passwordControl}
                  rules={{ required: 'Please confirm your new password' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Confirm New Password"
                      type="password"
                      fullWidth
                      error={!!passwordErrors.confirmPassword}
                      helperText={passwordErrors.confirmPassword?.message}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  startIcon={passwordSubmitting ? <CircularProgress size={20} /> : <SecurityIcon />}
                  disabled={passwordSubmitting}
                  sx={{ width: 'fit-content' }}
                >
                  {passwordSubmitting ? 'Changing...' : 'Change Password'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <BusinessIcon color="primary" />
              <Typography variant="h6">Account Information</Typography>
            </Box>
            
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  User ID:
                </Typography>
                <Typography>{user?.id}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Account Created:
                </Typography>
                <Typography>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Updated:
                </Typography>
                <Typography>{user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default UserProfile;
