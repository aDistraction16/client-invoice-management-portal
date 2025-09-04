import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { eq, and } from 'drizzle-orm';
import db from '../db/connection';
import { invoices, invoiceItems, clients, projects } from '../db/schema';
import { validateBody, validateParams } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { pdfService } from '../services/pdfService';
import { emailService } from '../services/emailService';

const router = Router();

// Validation schemas
const createInvoiceSchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  issueDate: Joi.string().required(), // Accept as string
  dueDate: Joi.string().required(), // Accept as string
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unitPrice: Joi.number().positive().required()
    })
  ).min(1).required(),
  notes: Joi.string().allow('').optional()
});

const updateInvoiceSchema = Joi.object({
  clientId: Joi.number().integer().positive().optional(),
  issueDate: Joi.string().optional(), // Accept as string
  dueDate: Joi.string().optional(), // Accept as string
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unitPrice: Joi.number().positive().required()
    })
  ).min(1).optional(),
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
  notes: Joi.string().allow('').optional()
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
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
    
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
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
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
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
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
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
    const invoiceId = parseInt(req.params.id);
    const { items, clientId, ...updateData } = req.body;

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

    // Prepare invoice update data - only include valid invoice table fields
    const invoiceUpdateData: any = {
      updatedAt: new Date()
    };

    // Only include fields that exist in the invoice table
    if (updateData.issueDate) invoiceUpdateData.issueDate = updateData.issueDate;
    if (updateData.dueDate) invoiceUpdateData.dueDate = updateData.dueDate;
    if (updateData.status) invoiceUpdateData.status = updateData.status;
    if (updateData.notes !== undefined) invoiceUpdateData.notes = updateData.notes;

    // Calculate total if items are provided
    if (items && items.length > 0) {
      invoiceUpdateData.totalAmount = calculateTotal(items).toString();
    }

    // Update invoice basic info
    const updatedInvoice = await db.update(invoices)
      .set(invoiceUpdateData)
      .where(eq(invoices.id, invoiceId))
      .returning();

    // If items are provided, update them
    if (items && items.length > 0) {
      // Delete existing items
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
      
      // Insert new items
      const itemsToInsert = items.map((item: any) => ({
        invoiceId: invoiceId,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        total: (item.quantity * item.unitPrice).toString()
      }));
      
      await db.insert(invoiceItems).values(itemsToInsert);
    }

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
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
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

// Update invoice status (flexible status management)
const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').required(),
  reason: Joi.string().optional()
});

router.patch('/:id/status', requireAuth, validateParams(idParamSchema), validateBody(statusUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
    const invoiceId = parseInt(req.params.id);
    const { status, reason } = req.body;

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

    const currentInvoice = existingInvoice[0].invoices;
    const client = existingInvoice[0].clients;

    // Update invoice status
    const updatedInvoice = await db.update(invoices)
      .set({ 
        status: status,
        updatedAt: new Date(),
        notes: reason ? `${currentInvoice.notes ? currentInvoice.notes + '\n\n' : ''}Status changed to ${status}${reason ? `: ${reason}` : ''}` : currentInvoice.notes
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Send appropriate emails based on status change
    try {
      if (status === 'paid' && currentInvoice.status !== 'paid') {
        // Send payment confirmation email
        const projectData = await db.select()
          .from(projects)
          .where(eq(projects.clientId, client.id))
          .limit(1);
        
        const currency = projectData.length > 0 ? projectData[0].currency : 'USD';

        if (client.email) {
          await emailService.sendPaymentConfirmationEmail(
            client.email,
            {
              invoiceNumber: currentInvoice.invoiceNumber,
              clientName: client.clientName,
              amountPaid: currentInvoice.totalAmount.toString(),
              paymentDate: new Date().toISOString(),
              paymentMethod: 'Manual Payment Processing',
              companyName: 'Company Name',
              currency: currency as 'USD' | 'PHP'
            }
          );
        }
      }
    } catch (emailError) {
      console.error('Email sending error during status update:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: `Invoice status updated to ${status}`,
      invoice: updatedInvoice[0],
      previousStatus: currentInvoice.status
    });

  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      error: 'Failed to update invoice status',
      message: 'An error occurred while updating the invoice status'
    });
  }
});

// Mark invoice as sent
router.patch('/:id/send', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
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

    // Send email with PDF attachment
    try {
      const invoice = existingInvoice[0].invoices;
      const client = existingInvoice[0].clients;
      
      // Get project to determine currency
      const projectData = await db.select()
        .from(projects)
        .where(eq(projects.clientId, client.id))
        .limit(1);
      
      const currency = projectData.length > 0 ? projectData[0].currency : 'USD';
      
      // Generate PDF for email attachment
      const invoiceItemsData = await db.select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));

      const pdfData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toString(),
        dueDate: invoice.dueDate.toString(),
        clientName: client.clientName,
        clientEmail: client.email || undefined,
        clientAddress: client.address || undefined,
        clientPhone: client.phoneNumber || undefined,
        companyName: 'Company Name',
        companyAddress: 'Your Company Address',
        companyPhone: 'Your Phone Number',
        companyEmail: 'your-email@company.com',
        currency: (currency === 'USD' || currency === 'PHP') ? currency : 'USD' as 'USD' | 'PHP',
        items: invoiceItemsData.map((item: any) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total)
        })),
        totalAmount: Number(invoice.totalAmount),
        notes: invoice.notes || undefined
      };

      let pdfBuffer: Buffer | undefined;
      try {
        pdfBuffer = await pdfService.generateInvoicePDF(pdfData);
      } catch (pdfError) {
        console.error('Failed to generate PDF for email:', pdfError);
        // Continue without PDF attachment
      }

      // Send email to client
      if (client.email) {
        const emailSent = await emailService.sendInvoiceEmail(
          client.email,
          {
            invoiceNumber: invoice.invoiceNumber,
            clientName: client.clientName,
            totalAmount: invoice.totalAmount.toString(),
            dueDate: invoice.dueDate.toString(),
            companyName: 'Company Name',
            currency: currency as 'USD' | 'PHP'
          },
          pdfBuffer
        );

        if (emailSent) {
          console.log(`✅ Invoice email sent successfully to ${client.email}`);
        } else {
          console.error(`❌ Failed to send invoice email to ${client.email}`);
        }
      } else {
        console.warn(`⚠️ No email address for client: ${client.clientName}`);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      message: 'Invoice sent successfully',
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
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
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

    // Send payment confirmation email
    try {
      const invoice = existingInvoice[0].invoices;
      const client = existingInvoice[0].clients;
      
      // Get project to determine currency
      const projectData = await db.select()
        .from(projects)
        .where(eq(projects.clientId, client.id))
        .limit(1);
      
      const currency = projectData.length > 0 ? projectData[0].currency : 'USD';

      // Send payment confirmation email to client
      if (client.email) {
        const emailSent = await emailService.sendPaymentConfirmationEmail(
          client.email,
          {
            invoiceNumber: invoice.invoiceNumber,
            clientName: client.clientName,
            amountPaid: invoice.totalAmount.toString(),
            paymentDate: new Date().toISOString(),
            paymentMethod: 'Manual Payment Processing',
            companyName: 'Company Name',
            currency: currency as 'USD' | 'PHP'
          }
        );

        if (emailSent) {
          console.log(`✅ Payment confirmation email sent to ${client.email}`);
        } else {
          console.error(`❌ Failed to send payment confirmation email to ${client.email}`);
        }
      } else {
        console.warn(`⚠️ No email address for client: ${client.clientName}`);
      }
    } catch (emailError) {
      console.error('Payment confirmation email error:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Invoice marked as paid and confirmation email sent',
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

// Send payment reminder
router.post('/:id/remind', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
    const invoiceId = parseInt(req.params.id);

    // Get invoice with client data
    const invoiceData = await db.select({
      invoice: invoices,
      client: clients,
      project: projects
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(clients.id, projects.clientId))
      .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
      .limit(1);

    if (invoiceData.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to send reminders'
      });
    }

    const invoice = invoiceData[0].invoice;
    const client = invoiceData[0].client;
    const project = invoiceData[0].project;

    // Check if invoice is not paid
    if (invoice.status === 'paid') {
      return res.status(400).json({
        error: 'Invoice already paid',
        message: 'Cannot send reminder for paid invoices'
      });
    }

    // Calculate days past due
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const currency = project?.currency || 'USD';

    // Send payment reminder email
    if (client.email) {
      const emailSent = await emailService.sendPaymentReminderEmail(
        client.email,
        {
          invoiceNumber: invoice.invoiceNumber,
          clientName: client.clientName,
          totalAmount: invoice.totalAmount.toString(),
          dueDate: invoice.dueDate.toString(),
          companyName: 'Company Name',
          currency: currency as 'USD' | 'PHP',
          daysPastDue: daysPastDue
        }
      );

      if (emailSent) {
        res.json({
          message: `Payment reminder sent successfully to ${client.email}`,
          daysPastDue: daysPastDue,
          reminderType: daysPastDue > 0 ? 'overdue' : 'due_today'
        });
      } else {
        res.status(500).json({
          error: 'Failed to send reminder',
          message: 'Email service encountered an error'
        });
      }
    } else {
      res.status(400).json({
        error: 'No email address',
        message: 'Client does not have an email address on file'
      });
    }

  } catch (error) {
    console.error('Send payment reminder error:', error);
    res.status(500).json({
      error: 'Failed to send payment reminder',
      message: 'An error occurred while sending the payment reminder'
    });
  }
});

// Generate invoice PDF
router.get('/:id/pdf', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
    const invoiceId = parseInt(req.params.id);

    // Get invoice with all related data
    const invoiceData = await db.select({
      invoice: invoices,
      client: clients,
      project: projects
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(clients.id, projects.clientId))
      .where(and(eq(invoices.id, invoiceId), eq(clients.userId, userId)))
      .limit(1);

    if (invoiceData.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice not found or you do not have permission to access it'
      });
    }

    // Get invoice items
    const items = await db.select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    const invoice = invoiceData[0].invoice;
    const client = invoiceData[0].client;
    const project = invoiceData[0].project;

    // Determine currency from project or default to USD
    const currency = project?.currency || 'USD';

    // Prepare PDF data
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toString(),
      dueDate: invoice.dueDate.toString(),
      clientName: client.clientName,
      clientEmail: client.email || undefined,
      clientAddress: client.address || undefined,
      clientPhone: client.phoneNumber || undefined,
      companyName: 'Company Name',
      companyAddress: 'Your Company Address',
      companyPhone: 'Your Phone Number',
      companyEmail: 'your-email@company.com',
      currency: (currency === 'USD' || currency === 'PHP') ? currency : 'USD' as 'USD' | 'PHP',
      items: items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total)
      })),
      totalAmount: Number(invoice.totalAmount),
      notes: invoice.notes || undefined
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateInvoicePDF(pdfData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: 'An error occurred while generating the invoice PDF'
    });
  }
});

export default router;
