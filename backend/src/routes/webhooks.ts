import { Router, Request, Response } from 'express';
import express from 'express';
import { stripeService, StripeWebhookEvent } from '../services/stripeService';
import { db } from '../db/connection';
import { invoices, clients } from '../db/schema';
import { eq } from 'drizzle-orm';
import { emailService } from '../services/emailService';

const router = Router();

/**
 * Stripe webhook endpoint for payment confirmations
 * POST /api/webhooks/stripe
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        error: 'Missing signature',
      });
    }

    try {
      // Get raw body for signature verification
      const rawBody = req.body;

      // Verify webhook signature
      const event = stripeService.verifyWebhookSignature(rawBody, signature);

      // Process the webhook event
      const webhookData = stripeService.processWebhookEvent(event);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(webhookData);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailure(webhookData);
          break;

        case 'payment_intent.canceled':
          await handlePaymentCancellation(webhookData);
          break;

        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event);
          break;

        default:
          // Unhandled webhook event type
          break;
      }

      res.json({
        message: 'Webhook processed successfully',
        eventType: event.type,
      });
    } catch (error: any) {
      res.status(400).json({
        error: 'Webhook processing failed',
        message: error.message,
      });
    }
  }
);

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(webhookData: any) {
  try {
    if (!webhookData.invoiceId) {
      return;
    }

    // Update invoice status to paid
    const updateResult = await db
      .update(invoices)
      .set({
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parseInt(webhookData.invoiceId)))
      .returning();

    // Get invoice and client details for email
    const invoiceData = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, parseInt(webhookData.invoiceId)))
      .limit(1);

    if (invoiceData.length > 0) {
      const { invoice, client } = invoiceData[0];

      // Send payment confirmation email
      if (client?.email) {
        try {
          await emailService.sendPaymentConfirmationEmail(client.email, {
            invoiceNumber: invoice.invoiceNumber,
            clientName: client.clientName,
            amountPaid: stripeService.formatAmount(webhookData.amount, webhookData.currency),
            paymentDate: new Date().toISOString(),
            paymentMethod: 'Credit Card',
            companyName: 'Company Name',
            currency: webhookData.currency.toUpperCase() === 'PHP' ? 'PHP' : 'USD',
          });
        } catch (emailError) {
          // Email error handled silently
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(webhookData: any) {
  try {
    if (!webhookData.invoiceId) {
      return;
    }

    // Update invoice status to overdue or failed
    await db
      .update(invoices)
      .set({
        status: 'overdue',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parseInt(webhookData.invoiceId)));

    // Get invoice and client details
    const invoiceData = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, parseInt(webhookData.invoiceId)))
      .limit(1);
  } catch (error) {
    throw error;
  }
}

/**
 * Handle payment cancellation
 */
async function handlePaymentCancellation(webhookData: any) {
  try {
    if (!webhookData.invoiceId) {
      return;
    }

    // Update invoice status back to pending
    await db
      .update(invoices)
      .set({
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parseInt(webhookData.invoiceId)));
  } catch (error) {
    throw error;
  }
}

/**
 * Handle checkout session completed (for Payment Links)
 */
async function handleCheckoutSessionCompleted(event: StripeWebhookEvent) {
  try {
    const session = event.data.object as any; // Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoice_id;

    if (!invoiceId) {
      return;
    }

    // Update invoice status to paid
    await db
      .update(invoices)
      .set({
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parseInt(invoiceId)));

    // Get invoice and client details for email
    const invoiceData = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, parseInt(invoiceId)))
      .limit(1);

    if (invoiceData.length > 0) {
      const { invoice, client } = invoiceData[0];

      // Send payment confirmation email
      if (client?.email) {
        try {
          await emailService.sendPaymentConfirmationEmail(client.email, {
            invoiceNumber: invoice.invoiceNumber,
            clientName: client.clientName,
            amountPaid: `${session.currency?.toUpperCase() || 'USD'} ${(session.amount_total / 100).toFixed(2)}`,
            paymentDate: new Date().toISOString(),
            paymentMethod: 'Payment Link',
            companyName: 'Company Name',
            currency: session.currency?.toUpperCase() === 'PHP' ? 'PHP' : 'USD',
          });
        } catch (emailError) {
          // Email error handled silently
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

export default router;
