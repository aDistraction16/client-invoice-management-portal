import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
  onPaymentSuccess: () => void;
}

// Load Stripe (we'll get the publishable key from environment)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

const PaymentForm: React.FC<{
  invoice: any;
  onSuccess: () => void;
  onError: (error: string) => void;
}> = ({ invoice, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [currency, setCurrency] = useState('usd');
  const [supportedCurrencies, setSupportedCurrencies] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Fetch supported currencies
    const fetchCurrencies = async () => {
      try {
        const response = await api.get('/payments/currencies');
        setSupportedCurrencies(response.data.data.currencies);
      } catch (error) {
        // Fallback currencies if fetch fails
        setSupportedCurrencies({
          'usd': 'US Dollar',
          'php': 'Philippine Peso'
        });
      }
    };

    fetchCurrencies();
  }, []);

  // Don't render if no invoice
  if (!invoice) {
    return <Alert severity="error">No invoice selected</Alert>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !invoice) {
      return;
    }

    setProcessing(true);

    try {
      // Create payment intent
      const paymentIntentResponse = await api.post('/payments/create-payment-intent', {
        invoiceId: invoice.id,
        currency: currency
      });

      const { client_secret } = paymentIntentResponse.data.data.paymentIntent;

      // Confirm payment
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: 'Customer Name', // You might want to get this from the invoice/client data
          },
        }
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (error: any) {
      onError(error.response?.data?.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(numAmount);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Details
        </Typography>
        
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Invoice #{invoice?.invoiceNumber || 'N/A'}
            </Typography>
            <Typography variant="h4" color="primary">
              {formatAmount(invoice?.totalAmount || '0', currency)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Due: {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
            </Typography>
          </CardContent>
        </Card>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Currency</InputLabel>
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            label="Currency"
          >
            {Object.entries(supportedCurrencies).map(([code, name]) => (
              <MenuItem key={code} value={code}>
                {code.toUpperCase()} - {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="subtitle2" gutterBottom>
          Card Information
        </Typography>
        
        <Box sx={{ 
          p: 2, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1,
          '& .StripeElement': {
            height: '40px',
            padding: '10px 12px',
            color: '#424770',
            backgroundColor: 'white',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          }
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          🔒 Payments are secure and encrypted
        </Typography>
        
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!stripe || processing}
          startIcon={processing ? <CircularProgress size={20} /> : null}
        >
          {processing ? 'Processing...' : `Pay ${formatAmount(invoice?.totalAmount || '0', currency)}`}
        </Button>
      </Box>
    </form>
  );
};

const PaymentDialog: React.FC<PaymentDialogProps> = ({ 
  open, 
  onClose, 
  invoice, 
  onPaymentSuccess 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onPaymentSuccess();
      onClose();
      setSuccess(false);
      setError(null);
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleClose = () => {
    if (!success) {
      onClose();
      setError(null);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5">
          💳 Secure Payment
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment successful! Thank you for your payment.
          </Alert>
        )}

        {!success && (
          <Elements stripe={stripePromise}>
            <PaymentForm
              invoice={invoice}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Elements>
        )}
      </DialogContent>
      
      {!success && (
        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PaymentDialog;
