import Stripe from 'stripe';
import { Invoice } from '../db/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

class StripeService {
  /**
   * Create a payment intent for an invoice
   */
  async createPaymentIntent(invoice: Invoice, currency: string = 'usd', clientEmail?: string): Promise<PaymentIntent> {
    try {
      // Convert amount to cents (Stripe expects smallest currency unit)
      const amountInCents = Math.round(parseFloat(invoice.totalAmount.toString()) * 100);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          invoice_id: invoice.id.toString(),
          invoice_number: invoice.invoiceNumber,
          client_email: clientEmail || '',
        },
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        receipt_email: clientEmail || undefined,
      });

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      throw new Error(`Failed to create payment intent: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve payment intent: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error: any) {
      throw new Error(`Failed to cancel payment intent: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Process webhook events from Stripe
   */
  processWebhookEvent(event: StripeWebhookEvent): {
    type: string;
    invoiceId: string | null;
    paymentIntentId: string;
    status: string;
    amount?: number;
    currency?: string;
  } {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = paymentIntent.metadata?.invoice_id || null;

    return {
      type: event.type,
      invoiceId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook verification');
      }

      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event as StripeWebhookEvent;
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get supported currencies with their display names
   */
  getSupportedCurrencies(): { [key: string]: string } {
    return {
      'usd': 'US Dollar',
      'php': 'Philippine Peso',
      'eur': 'Euro',
      'gbp': 'British Pound',
      'cad': 'Canadian Dollar',
      'aud': 'Australian Dollar',
      'jpy': 'Japanese Yen',
      'sgd': 'Singapore Dollar',
    };
  }

  /**
   * Format amount for display based on currency
   */
  formatAmount(amount: number, currency: string): string {
    const amountInDollars = amount / 100; // Convert from cents
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amountInDollars);
  }

  /**
   * Create a payment link for an invoice (alternative to payment intent)
   */
  async createPaymentLink(invoice: Invoice, currency?: string): Promise<{ url: string; id: string }> {
    try {
      // Use invoice currency if available, otherwise use the provided currency or default to PHP
      const invoiceCurrency = (invoice as any).currency || currency || 'php';
      
      // Convert amount to cents
      const amountInCents = Math.round(parseFloat(invoice.totalAmount.toString()) * 100);
      
      // First create a product
      const product = await stripe.products.create({
        name: `Invoice ${invoice.invoiceNumber}`,
        description: `Payment for services rendered`,
        metadata: {
          invoice_id: invoice.id.toString(),
          invoice_number: invoice.invoiceNumber,
        },
      });

      // Then create a price for the product
      const price = await stripe.prices.create({
        currency: invoiceCurrency.toLowerCase(),
        unit_amount: amountInCents,
        product: product.id,
      });

      // Finally create the payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: invoice.id.toString(),
          invoice_number: invoice.invoiceNumber,
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.FRONTEND_URL}/invoices/${invoice.id}/payment-success?payment=completed&invoice=${invoice.invoiceNumber}`,
          },
        },
        // Additional options to ensure proper redirect
        allow_promotion_codes: false,
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['US', 'PH', 'CA', 'GB'],
        },
      });

      return {
        url: paymentLink.url,
        id: paymentLink.id,
      };
    } catch (error: any) {
      throw new Error(`Failed to create payment link: ${error?.message || 'Unknown error'}`);
    }
  }
}

export const stripeService = new StripeService();
export default stripeService;
