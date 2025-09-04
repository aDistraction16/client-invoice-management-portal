import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { eq, and } from 'drizzle-orm';
import db from '../db/connection';
import { clients } from '../db/schema';
import { validateBody, validateParams } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const createClientSchema = Joi.object({
  clientName: Joi.string().required(),
  contactPerson: Joi.string().optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
});

const updateClientSchema = Joi.object({
  clientName: Joi.string().optional(),
  contactPerson: Joi.string().optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

// Get all clients for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    const userClients = await db.select().from(clients).where(eq(clients.userId, userId));

    res.json({
      clients: userClients,
      total: userClients.length,
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      error: 'Failed to fetch clients',
      message: 'An error occurred while fetching clients',
    });
  }
});

// Get single client by ID
router.get(
  '/:id',
  requireAuth,
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const clientId = parseInt(req.params.id);

      const client = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
        .limit(1);

      if (client.length === 0) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Client not found or you do not have permission to access it',
        });
      }

      res.json({ client: client[0] });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        error: 'Failed to fetch client',
        message: 'An error occurred while fetching the client',
      });
    }
  }
);

// Create new client
router.post(
  '/',
  requireAuth,
  validateBody(createClientSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const { clientName, contactPerson, email, address, phoneNumber } = req.body;

      const newClient = await db
        .insert(clients)
        .values({
          userId,
          clientName,
          contactPerson,
          email,
          address,
          phoneNumber,
        })
        .returning();

      res.status(201).json({
        message: 'Client created successfully',
        client: newClient[0],
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        error: 'Failed to create client',
        message: 'An error occurred while creating the client',
      });
    }
  }
);

// Update client
router.put(
  '/:id',
  requireAuth,
  validateParams(idParamSchema),
  validateBody(updateClientSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const clientId = parseInt(req.params.id);
      const updateData = req.body;

      // Check if client exists and belongs to user
      const existingClient = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
        .limit(1);

      if (existingClient.length === 0) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Client not found or you do not have permission to update it',
        });
      }

      // Update client
      const updatedClient = await db
        .update(clients)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
        .returning();

      res.json({
        message: 'Client updated successfully',
        client: updatedClient[0],
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        error: 'Failed to update client',
        message: 'An error occurred while updating the client',
      });
    }
  }
);

// Delete client
router.delete(
  '/:id',
  requireAuth,
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const clientId = parseInt(req.params.id);

      // Check if client exists and belongs to user
      const existingClient = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
        .limit(1);

      if (existingClient.length === 0) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Client not found or you do not have permission to delete it',
        });
      }

      // Delete client
      await db.delete(clients).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));

      res.json({
        message: 'Client deleted successfully',
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        error: 'Failed to delete client',
        message: 'An error occurred while deleting the client',
      });
    }
  }
);

export default router;
