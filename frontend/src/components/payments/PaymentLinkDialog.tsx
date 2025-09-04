import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Link,
  Card,
  CardContent
} from '@mui/material';
import { Payment, Launch, ContentCopy } from '@mui/icons-material';
import api from '../../services/api';

interface PaymentLinkDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess?: () => void;
}

const PaymentLinkDialog: React.FC<PaymentLinkDialogProps> = ({ 
  open, 
  onClose, 
  invoice, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [currency, setCurrency] = useState('usd');
  const [copySuccess, setCopySuccess] = useState(false);
  const [initialInvoice, setInitialInvoice] = useState(invoice); // Capture initial invoice
  const [supportedCurrencies] = useState({
    'usd': 'US Dollar',
    'php': 'Philippine Peso',
    'eur': 'Euro',
    'gbp': 'British Pound'
  });

  // Set initial invoice when dialog opens and don't change it during re-renders
  useEffect(() => {
    if (open && invoice && !initialInvoice) {
      setInitialInvoice(invoice);
    }
  }, [open, invoice, initialInvoice]);

  // Don't render if no invoice is provided
  if (!invoice) {
    return null;
  }

  const handleCreatePaymentLink = async () => {
    if (!invoice) {
      setError('No invoice selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/payments/create-payment-link', {
        invoiceId: invoice.id,
        currency: currency
      });
      
      // Handle different possible response structures
      let linkUrl = null;
      if (response.data.data?.paymentLink?.url) {
        linkUrl = response.data.data.paymentLink.url;
      } else if (response.data.paymentLink?.url) {
        linkUrl = response.data.paymentLink.url;
      } else if (response.data.paymentLink) {
        linkUrl = response.data.paymentLink;
      } else if (response.data.url) {
        linkUrl = response.data.url;
      }

      if (linkUrl) {
        setPaymentLink(linkUrl);
      } else {
        setError('Payment link not found in server response');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (paymentLink) {
      try {
        await navigator.clipboard.writeText(paymentLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(numAmount);
  };

  const handleClose = () => {
    onClose();
    setPaymentLink(null);
    setError(null);
    setCopySuccess(false);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        💳 Create Payment Link
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Invoice #{invoice?.invoiceNumber || 'N/A'}
            </Typography>
            <Typography variant="h4" color="primary">
              {invoice ? formatAmount(invoice.totalAmount, currency) : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Due: {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
            </Typography>
          </CardContent>
        </Card>

        {!paymentLink ? (
          <>
            <FormControl fullWidth sx={{ mb: 3 }}>
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

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This will create a secure payment link that you can share with your client. 
              The link will redirect to a Stripe-hosted payment page.
            </Typography>
          </>
        ) : (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Payment link created successfully!
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              Payment Link:
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 2, p: 2, bgcolor: 'grey.50' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {paymentLink}
              </Typography>
            </Card>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={handleCopyLink}
                size="small"
                color={copySuccess ? "success" : "primary"}
              >
                {copySuccess ? 'Copied!' : 'Copy Link'}
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Launch />}
                component={Link}
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              >
                Open Payment Page
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          {paymentLink ? 'Close' : 'Cancel'}
        </Button>
        
        {!paymentLink && (
          <Button
            variant="contained"
            onClick={handleCreatePaymentLink}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Payment />}
          >
            {loading ? 'Creating...' : 'Create Payment Link'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaymentLinkDialog;
