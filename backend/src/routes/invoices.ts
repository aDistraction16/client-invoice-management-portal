import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { eq, and } from 'drizzle-orm';
import db from '../db/connection';
import { invoices, invoiceItems, clients } from '../db/schema';
import { validateBody, validateParams } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const createInvoiceSchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  issueDate: Joi.date().required(),
  dueDate: Joi.date().required(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().precision(2).required(),
      unitPrice: Joi.number().positive().precision(2).required()
    })
  ).min(1).required(),
  notes: Joi.string().optional()
});

const updateInvoiceSchema = Joi.object({
  issueDate: Joi.date().optional(),
  dueDate: Joi.date().optional(),
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
  notes: Joi.string().optional()
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

// Generate invoice number
const generateInvoiceNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
};

// Calculate invoice total
const calculateTotal = (items: any[]): number => {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
};

// Get all invoices for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    
    const userInvoices = await db.select({
      id: invoices.id,
      clientId: invoices.clientId,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      createdAt: invoices.createdAt,
      clientName: clients.clientName,
      clientEmail: clients.email
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(clients.userId, userId));
    
    res.json({
      invoices: userInvoices,
      total: userInvoices.length
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      message: 'An error occurred while fetching invoices'
    });
  }
});

// Get single invoice by ID with items
router.get('/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const invoiceId = parseInt(req.params.id);
    
    const invoice = await db.select({
      id: invoices.id,
      clientId: invoices.clientId,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      paymentLink: invoices.paymentLink,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      clientName: clients.clientName,
      clientEmail: clients.email,
      clientAddress: clients.address,
      clientPhone: clients.phoneNumber
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
    .limit(1);
    
    if (invoice.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to access it'
      });
    }

    // Get invoice items
    const items = await db.select().from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));
    
    res.json({ 
      invoice: {
        ...invoice[0],
        items
      }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Failed to fetch invoice',
      message: 'An error occurred while fetching the invoice'
    });
  }
});

// Create new invoice
router.post('/', requireAuth, validateBody(createInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const { clientId, issueDate, dueDate, items, notes } = req.body;

    // Verify client belongs to user
    const clientCheck = await db.select().from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .limit(1);

    if (clientCheck.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Client not found or you do not have permission to create invoices for it'
      });
    }

    // Calculate total amount
    const totalAmount = calculateTotal(items);
    const invoiceNumber = generateInvoiceNumber();

    // Create invoice
    const newInvoice = await db.insert(invoices).values({
      clientId,
      userId,
      invoiceNumber,
      issueDate,
      dueDate,
      totalAmount: totalAmount.toString(),
      status: 'draft',
      notes
    }).returning();

    const invoiceId = newInvoice[0].id;

    // Create invoice items
    const itemsData = items.map((item: any) => ({
      invoiceId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      total: (item.quantity * item.unitPrice).toString()
    }));

    const newItems = await db.insert(invoiceItems).values(itemsData).returning();

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: {
        ...newInvoice[0],
        items: newItems
      }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      error: 'Failed to create invoice',
      message: 'An error occurred while creating the invoice'
    });
  }
});

// Update invoice
router.put('/:id', requireAuth, validateParams(idParamSchema), validateBody(updateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const invoiceId = parseInt(req.params.id);
    const updateData = req.body;

    // Check if invoice exists and belongs to user
    const existingInvoice = await db.select()
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
      .limit(1);

    if (existingInvoice.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to update it'
      });
    }

    // Update invoice
    const updatedInvoice = await db.update(invoices)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();

    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice[0]
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      error: 'Failed to update invoice',
      message: 'An error occurred while updating the invoice'
    });
  }
});

// Delete invoice
router.delete('/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const invoiceId = parseInt(req.params.id);

    // Check if invoice exists and belongs to user
    const existingInvoice = await db.select()
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
      .limit(1);

    if (existingInvoice.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to delete it'
      });
    }

    // Delete invoice items first (due to foreign key constraint)
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    
    // Delete invoice
    await db.delete(invoices).where(eq(invoices.id, invoiceId));

    res.json({
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      error: 'Failed to delete invoice',
      message: 'An error occurred while deleting the invoice'
    });
  }
});

// Mark invoice as sent
router.patch('/:id/send', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const invoiceId = parseInt(req.params.id);

    // Check if invoice exists and belongs to user
    const existingInvoice = await db.select()
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
      .limit(1);

    if (existingInvoice.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to send it'
      });
    }

    // Update invoice status to sent
    const updatedInvoice = await db.update(invoices)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // TODO: Implement email sending logic here
    
    res.json({
      message: 'Invoice marked as sent',
      invoice: updatedInvoice[0]
    });

  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({
      error: 'Failed to send invoice',
      message: 'An error occurred while sending the invoice'
    });
  }
});

// Mark invoice as paid
router.patch('/:id/pay', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const invoiceId = parseInt(req.params.id);

    // Check if invoice exists and belongs to user
    const existingInvoice = await db.select()
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
      .limit(1);

    if (existingInvoice.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to mark it as paid'
      });
    }

    // Update invoice status to paid
    const updatedInvoice = await db.update(invoices)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();

    res.json({
      message: 'Invoice marked as paid',
      invoice: updatedInvoice[0]
    });

  } catch (error) {
    console.error('Mark invoice as paid error:', error);
    res.status(500).json({
      error: 'Failed to mark invoice as paid',
      message: 'An error occurred while updating the invoice'
    });
  }
});

export default router;
