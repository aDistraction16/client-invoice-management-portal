import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { eq, and } from 'drizzle-orm';
import db from '../db/connection';
import { timeEntries, projects, clients } from '../db/schema';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const createTimeEntrySchema = Joi.object({
  projectId: Joi.number().integer().positive().required(),
  date: Joi.string().required(), // Accept as string, will be converted to Date
  hoursLogged: Joi.number().positive().required(),
  description: Joi.string().allow('').optional(),
});

const updateTimeEntrySchema = Joi.object({
  date: Joi.string().optional(), // Accept as string, will be converted to Date
  hoursLogged: Joi.number().positive().optional(),
  description: Joi.string().allow('').optional(),
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const querySchema = Joi.object({
  projectId: Joi.number().integer().positive().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
});

// Get time entries with filtering and pagination
router.get('/', requireAuth, validateQuery(querySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (typeof userId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }
    const { projectId, startDate, endDate, page, limit } = req.query as any;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: timeEntries.id,
        projectId: timeEntries.projectId,
        date: timeEntries.date,
        hoursLogged: timeEntries.hoursLogged,
        description: timeEntries.description,
        createdAt: timeEntries.createdAt,
        projectName: projects.projectName,
        clientName: clients.clientName,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(clients.userId, userId));

    // Apply filters
    if (projectId) {
      query = query.where(eq(timeEntries.projectId, projectId));
    }

    // Note: Date filtering would need additional where conditions
    // This is a simplified version

    const entries = await query.limit(limit).offset(offset);

    res.json({
      timeEntries: entries,
      pagination: {
        page,
        limit,
        total: entries.length,
      },
    });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({
      error: 'Failed to fetch time entries',
      message: 'An error occurred while fetching time entries',
    });
  }
});

// Get time entries by project ID
router.get(
  '/project/:projectId',
  requireAuth,
  validateParams(Joi.object({ projectId: Joi.number().integer().positive().required() })),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const projectId = parseInt(req.params.projectId);

      // Verify project belongs to user
      const projectCheck = await db
        .select()
        .from(projects)
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(projects.id, projectId), eq(clients.userId, userId)))
        .limit(1);

      if (projectCheck.length === 0) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to access it',
        });
      }

      const entries = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.projectId, projectId))
        .orderBy(timeEntries.date);

      res.json({
        timeEntries: entries,
        total: entries.length,
      });
    } catch (error) {
      console.error('Get project time entries error:', error);
      res.status(500).json({
        error: 'Failed to fetch project time entries',
        message: 'An error occurred while fetching project time entries',
      });
    }
  }
);

// Get single time entry by ID
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
      const entryId = parseInt(req.params.id);

      const entry = await db
        .select({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          date: timeEntries.date,
          hoursLogged: timeEntries.hoursLogged,
          description: timeEntries.description,
          createdAt: timeEntries.createdAt,
          updatedAt: timeEntries.updatedAt,
          projectName: projects.projectName,
          clientName: clients.clientName,
        })
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(timeEntries.id, entryId), eq(clients.userId, userId)))
        .limit(1);

      if (entry.length === 0) {
        return res.status(404).json({
          error: 'Time entry not found',
          message: 'Time entry not found or you do not have permission to access it',
        });
      }

      res.json({ timeEntry: entry[0] });
    } catch (error) {
      console.error('Get time entry error:', error);
      res.status(500).json({
        error: 'Failed to fetch time entry',
        message: 'An error occurred while fetching the time entry',
      });
    }
  }
);

// Create new time entry
router.post(
  '/',
  requireAuth,
  validateBody(createTimeEntrySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const { projectId, date, hoursLogged, description } = req.body;

      // Verify project belongs to user
      const projectCheck = await db
        .select()
        .from(projects)
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(projects.id, projectId), eq(clients.userId, userId)))
        .limit(1);

      if (projectCheck.length === 0) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to log time for it',
        });
      }

      const newEntry = await db
        .insert(timeEntries)
        .values({
          projectId,
          userId,
          date,
          hoursLogged: hoursLogged.toString(),
          description,
        })
        .returning();

      res.status(201).json({
        message: 'Time entry created successfully',
        timeEntry: newEntry[0],
      });
    } catch (error) {
      console.error('Create time entry error:', error);
      res.status(500).json({
        error: 'Failed to create time entry',
        message: 'An error occurred while creating the time entry',
      });
    }
  }
);

// Update time entry
router.put(
  '/:id',
  requireAuth,
  validateParams(idParamSchema),
  validateBody(updateTimeEntrySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (typeof userId !== 'number') {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      const entryId = parseInt(req.params.id);
      const updateData = req.body;

      // Check if time entry exists and belongs to user
      const existingEntry = await db
        .select()
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(timeEntries.id, entryId), eq(clients.userId, userId)))
        .limit(1);

      if (existingEntry.length === 0) {
        return res.status(404).json({
          error: 'Time entry not found',
          message: 'Time entry not found or you do not have permission to update it',
        });
      }

      // Update time entry
      const updatedEntry = await db
        .update(timeEntries)
        .set({
          ...updateData,
          hoursLogged: updateData.hoursLogged ? updateData.hoursLogged.toString() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, entryId))
        .returning();

      res.json({
        message: 'Time entry updated successfully',
        timeEntry: updatedEntry[0],
      });
    } catch (error) {
      console.error('Update time entry error:', error);
      res.status(500).json({
        error: 'Failed to update time entry',
        message: 'An error occurred while updating the time entry',
      });
    }
  }
);

// Delete time entry
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
      const entryId = parseInt(req.params.id);

      // Check if time entry exists and belongs to user
      const existingEntry = await db
        .select()
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(timeEntries.id, entryId), eq(clients.userId, userId)))
        .limit(1);

      if (existingEntry.length === 0) {
        return res.status(404).json({
          error: 'Time entry not found',
          message: 'Time entry not found or you do not have permission to delete it',
        });
      }

      // Delete time entry
      await db.delete(timeEntries).where(eq(timeEntries.id, entryId));

      res.json({
        message: 'Time entry deleted successfully',
      });
    } catch (error) {
      console.error('Delete time entry error:', error);
      res.status(500).json({
        error: 'Failed to delete time entry',
        message: 'An error occurred while deleting the time entry',
      });
    }
  }
);

export default router;
