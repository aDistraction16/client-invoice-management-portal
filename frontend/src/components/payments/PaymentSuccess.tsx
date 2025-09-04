import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import api from '../../services/api';

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  clientName?: string;
}

const PaymentSuccess: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    const fetchInvoiceStatus = async () => {
      if (!invoiceId) {
        setError('Invoice ID not found');
        setLoading(false);
        return;
      }

      try {
        // Fetch the updated invoice status
        const response = await api.get(`/invoices/${invoiceId}`);
        const invoiceData = response.data.invoice;
        setInvoice(invoiceData);
        
        // If still not paid, continue polling
        if (invoiceData.status !== 'paid') {
          console.log('Invoice not yet paid, will poll again...');
        } else {
          // Payment confirmed, stop polling
          console.log('Invoice payment confirmed!');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (err: any) {
        console.error('Error fetching invoice:', err);
        setError('Failed to fetch invoice details');
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch with delay
    const initialTimer = setTimeout(async () => {
      await fetchInvoiceStatus();
      
      // Set up polling every 3 seconds if needed
      pollInterval = setInterval(fetchInvoiceStatus, 3000);
      
      // Stop polling after 2 minutes to avoid infinite polling
      setTimeout(() => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }, 120000);
    }, 2000);

    // Cleanup
    return () => {
      clearTimeout(initialTimer);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [invoiceId]);

  const handleBackToInvoices = () => {
    navigate('/invoices');
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Processing your payment...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Please wait while we confirm your payment
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        gap={2}
      >
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleBackToInvoices}>
          Back to Invoices
        </Button>
      </Box>
    );
  }

  const isPaid = invoice?.status === 'paid';

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="400px"
      gap={3}
      sx={{ p: 3 }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          {isPaid ? (
            <>
              <CheckCircleOutlineIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main', 
                  mb: 2 
                }} 
              />
              <Typography variant="h4" color="success.main" gutterBottom>
                Payment Successful!
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Thank you for your payment
              </Typography>
              
              {invoice && (
                <Box sx={{ mt: 3, mb: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Invoice:</strong> {invoice.invoiceNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Amount Paid:</strong> {formatAmount(invoice.totalAmount, invoice.currency)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Status:</strong> 
                    <span style={{ 
                      color: '#4caf50', 
                      fontWeight: 'bold',
                      marginLeft: '8px'
                    }}>
                      PAID
                    </span>
                  </Typography>
                </Box>
              )}

              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                A confirmation email has been sent to you with the payment details.
                The invoice status has been updated in our system.
              </Typography>
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Payment is being processed. The invoice status will be updated shortly.
              </Alert>
              <Typography variant="h6" gutterBottom>
                Payment Processing
              </Typography>
              {invoice && (
                <Typography variant="body1" gutterBottom>
                  Invoice {invoice.invoiceNumber} - Status: {invoice.status}
                </Typography>
              )}
            </>
          )}

          <Box sx={{ mt: 4 }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleBackToInvoices}
            >
              Back to Invoices
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentSuccess;
