import React from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  title = 'Something went wrong',
}) => {
  return (
    <Box sx={{ my: 2 }}>
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" startIcon={<Refresh />} onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {error}
      </Alert>
    </Box>
  );
};

export default ErrorDisplay;
