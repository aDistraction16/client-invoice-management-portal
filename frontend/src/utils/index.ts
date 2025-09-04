import dayjs from 'dayjs';

export const formatDate = (dateString: string): string => {
  try {
    return dayjs(dateString).format('MMM DD, YYYY');
  } catch (error) {
    return dateString;
  }
};

export const formatCurrency = (amount: string | number, currency: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Map currency codes to locale and formatting
  const currencyConfig = {
    USD: { locale: 'en-US', symbol: '$' },
    PHP: { locale: 'en-PH', symbol: '₱' }
  };
  
  const config = currencyConfig[currency as keyof typeof currencyConfig] || currencyConfig.USD;
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
};

export const formatHours = (hours: string | number): string => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  return `${numHours.toFixed(2)} hrs`;
};

export const formatTime = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}m`;
  }
};

export const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'completed':
      return 'primary';
    case 'paused':
      return 'warning';
    case 'draft':
      return 'default';
    case 'sent':
      return 'info';
    case 'paid':
      return 'success';
    case 'overdue':
      return 'error';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
};

export const calculateInvoiceTotal = (items: Array<{ quantity: number; unitPrice: number }>): number => {
  return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
