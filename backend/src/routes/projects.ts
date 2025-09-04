import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { eq, and } from 'drizzle-orm';
import db from '../db/connection';
import { projects, clients } from '../db/schema';
import { validateBody, validateParams } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const createProjectSchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  projectName: Joi.string().required(),
  description: Joi.string().optional(),
  hourlyRate: Joi.number().positive().precision(2).required(),
  status: Joi.string().valid('active', 'completed', 'paused').default('active')
});

const updateProjectSchema = Joi.object({
  projectName: Joi.string().optional(),
  description: Joi.string().optional(),
  hourlyRate: Joi.number().positive().precision(2).optional(),
  status: Joi.string().valid('active', 'completed', 'paused').optional()
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

// Get all projects for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    
    const userProjects = await db.select({
      id: projects.id,
      clientId: projects.clientId,
      projectName: projects.projectName,
      description: projects.description,
      hourlyRate: projects.hourlyRate,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      clientName: clients.clientName
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(clients.userId, userId));
    
    res.json({
      projects: userProjects,
      total: userProjects.length
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: 'An error occurred while fetching projects'
    });
  }
});

// Get projects by client ID
router.get('/client/:clientId', requireAuth, validateParams(Joi.object({ clientId: Joi.number().integer().positive().required() })), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const clientId = parseInt(req.params.clientId);
    
    // Verify client belongs to user
    const clientCheck = await db.select().from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .limit(1);
    
    if (clientCheck.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Client not found or you do not have permission to access it'
      });
    }
    
    const clientProjects = await db.select().from(projects)
      .where(eq(projects.clientId, clientId));
    
    res.json({
      projects: clientProjects,
      total: clientProjects.length
    });

  } catch (error) {
    console.error('Get client projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch client projects',
      message: 'An error occurred while fetching client projects'
    });
  }
});

// Get single project by ID
router.get('/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const projectId = parseInt(req.params.id);
    
    const project = await db.select({
      id: projects.id,
      clientId: projects.clientId,
      projectName: projects.projectName,
      description: projects.description,
      hourlyRate: projects.hourlyRate,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      clientName: clients.clientName,
      clientEmail: clients.email
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, projectId), eq(clients.userId, userId)))
    .limit(1);
    
    if (project.length === 0) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project not found or you do not have permission to access it'
      });
    }
    
    res.json({ project: project[0] });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: 'An error occurred while fetching the project'
    });
  }
});

// Create new project
router.post('/', requireAuth, validateBody(createProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const { clientId, projectName, description, hourlyRate, status } = req.body;

    // Verify client belongs to user
    const clientCheck = await db.select().from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .limit(1);

    if (clientCheck.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Client not found or you do not have permission to create projects for it'
      });
    }

    const newProject = await db.insert(projects).values({
      clientId,
      projectName,
      description,
      hourlyRate: hourlyRate.toString(),
      status
    }).returning();

    res.status(201).json({
      message: 'Project created successfully',
      project: newProject[0]
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: 'An error occurred while creating the project'
    });
  }
});

// Update project
router.put('/:id', requireAuth, validateParams(idParamSchema), validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const projectId = parseInt(req.params.id);
    const updateData = req.body;

    // Check if project exists and belongs to user
    const existingProject = await db.select()
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(and(eq(projects.id, projectId), eq(clients.userId, userId)))
      .limit(1);

    if (existingProject.length === 0) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project not found or you do not have permission to update it'
      });
    }

    // Update project
    const updatedProject = await db.update(projects)
      .set({ 
        ...updateData, 
        hourlyRate: updateData.hourlyRate ? updateData.hourlyRate.toString() : undefined,
        updatedAt: new Date() 
      })
      .where(eq(projects.id, projectId))
      .returning();

    res.json({
      message: 'Project updated successfully',
      project: updatedProject[0]
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: 'An error occurred while updating the project'
    });
  }
});

// Delete project
router.delete('/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const projectId = parseInt(req.params.id);

    // Check if project exists and belongs to user
    const existingProject = await db.select()
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(and(eq(projects.id, projectId), eq(clients.userId, userId)))
      .limit(1);

    if (existingProject.length === 0) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project not found or you do not have permission to delete it'
      });
    }

    // Delete project
    await db.delete(projects).where(eq(projects.id, projectId));

    res.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: 'An error occurred while deleting the project'
    });
  }
});

export default router;
