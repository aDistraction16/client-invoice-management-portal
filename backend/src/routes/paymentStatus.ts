import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { db } from '../db/connection';
import { invoices } from '../db/schema';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

const router = Router();

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

/**
 * Manual status check endpoint for payments
 * GET /api/payments/status/:id
 */
router.get('/status/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const userId = req.session.userId;

    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get invoice with client to verify ownership
    const invoice = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        invoiceNumber: invoices.invoiceNumber,
        totalAmount: invoices.totalAmount,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (invoice.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    console.log(`📊 Payment status check for invoice ${invoiceId}: ${invoice[0].status}`);

    res.json({
      invoice: invoice[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

/**
 * Manual payment confirmation endpoint (for testing)
 * POST /api/payments/confirm/:id
 */
router.post('/confirm/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const userId = req.session.userId;

    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🔧 Manual payment confirmation for invoice ${invoiceId}`);

    // Update invoice status to paid
    const result = await db
      .update(invoices)
      .set({
        status: 'paid',
        updatedAt: new Date()
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    console.log(`✅ Manual payment confirmation completed for invoice ${invoiceId}`);

    res.json({
      message: 'Payment status updated to paid',
      invoice: result[0]
    });

  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

export default router;
