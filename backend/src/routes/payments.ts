import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { stripeService } from '../services/stripeService';
import { db } from '../db/connection';
import { invoices, clients } from '../db/schema';
import { eq } from 'drizzle-orm';
import { emailService } from '../services/emailService';

const router = Router();

// Apply authentication middleware to all payment routes
router.use(requireAuth);

/**
 * Create payment intent for an invoice
 * POST /api/payments/create-payment-intent
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const { invoiceId, currency = 'usd' } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        message: 'Invoice ID is required',
        error: 'INVALID_REQUEST'
      });
    }

    // Get invoice with client details
    const invoiceData = await db
      .select({
        invoice: invoices,
        client: clients
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoiceData.length) {
      return res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND'
      });
    }

    const { invoice, client } = invoiceData[0];

    // Check if user owns this invoice
    if (invoice.userId !== req.user!.id) {
      return res.status(403).json({
        message: 'Access denied',
        error: 'UNAUTHORIZED'
      });
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      invoice,
      currency,
      client?.email || undefined
    );

    // Update invoice with payment link
    await db
      .update(invoices)
      .set({ 
        paymentLink: `https://dashboard.stripe.com/payments/${paymentIntent.id}`,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, invoiceId));

    res.json({
      message: 'Payment intent created successfully',
      data: {
        paymentIntent,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating payment intent:', error);
    res.status(500).json({
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
});

/**
 * Create payment link for an invoice
 * POST /api/payments/create-payment-link
 */
router.post('/create-payment-link', async (req: Request, res: Response) => {
  try {
    const { invoiceId, currency = 'usd' } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        message: 'Invoice ID is required',
        error: 'INVALID_REQUEST'
      });
    }

    // Get invoice
    const invoiceResult = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoiceResult.length) {
      return res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND'
      });
    }

    const invoice = invoiceResult[0];

    // Check if user owns this invoice (use session userId)
    const userId = req.session.userId;
    if (invoice.userId !== userId) {
      return res.status(403).json({
        message: 'Access denied',
        error: 'UNAUTHORIZED'
      });
    }

    // Create payment link (will use invoice currency if available)
    const paymentLink = await stripeService.createPaymentLink(invoice, currency);

    // Update invoice with payment link
    await db
      .update(invoices)
      .set({ 
        paymentLink: paymentLink.url,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, invoiceId));

    res.json({
      message: 'Payment link created successfully',
      data: {
        paymentLink
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating payment link:', error);
    res.status(500).json({
      message: 'Failed to create payment link',
      error: error.message
    });
  }
});

/**
 * Get payment status for an invoice
 * GET /api/payments/status/:invoiceId
 */
router.get('/status/:invoiceId', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;

    // Get invoice
    const invoiceResult = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parseInt(invoiceId)))
      .limit(1);

    if (!invoiceResult.length) {
      return res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND'
      });
    }

    const invoice = invoiceResult[0];

    // Check if user owns this invoice
    if (invoice.userId !== req.user!.id) {
      return res.status(403).json({
        message: 'Access denied',
        error: 'UNAUTHORIZED'
      });
    }

    res.json({
      message: 'Payment status retrieved successfully',
      data: {
        invoiceId: invoice.id,
        status: invoice.status,
        paymentLink: invoice.paymentLink,
        totalAmount: invoice.totalAmount
      }
    });

  } catch (error: any) {
    console.error('❌ Error getting payment status:', error);
    res.status(500).json({
      message: 'Failed to get payment status',
      error: error.message
    });
  }
});

/**
 * Get supported currencies
 * GET /api/payments/currencies
 */
router.get('/currencies', async (req: Request, res: Response) => {
  try {
    const currencies = stripeService.getSupportedCurrencies();
    
    res.json({
      message: 'Supported currencies retrieved successfully',
      data: {
        currencies
      }
    });

  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to get supported currencies',
      error: error.message
    });
  }
});

/**
 * Cancel payment intent
 * POST /api/payments/cancel/:paymentIntentId
 */
router.post('/cancel/:paymentIntentId', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        message: 'Payment intent ID is required',
        error: 'INVALID_REQUEST'
      });
    }

    // Get payment intent details first
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);
    const invoiceId = paymentIntent.id; // This would need metadata lookup in a real implementation

    // Cancel the payment intent
    await stripeService.cancelPaymentIntent(paymentIntentId);

    res.json({
      message: 'Payment intent cancelled successfully',
      data: {
        paymentIntentId,
        status: 'cancelled'
      }
    });

  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to cancel payment intent',
      error: error.message
    });
  }
});

export default router;
