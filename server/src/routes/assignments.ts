import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';
import { notifyAssignmentAdded, notifyAssignmentRemoved } from '../services/notificationService';

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

// POST /api/assignments
assignmentsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignment = await prisma.assignment.create({
      data: req.body,
      include: {
        resource: { include: { user: true } },
        project: true,
        role: true,
      },
    });
    await logAction(req.user!.id, 'create', 'assignment', assignment.id, req.body, req.ip);

    // Notify only the assigned resource if they have a linked user account
    const { resource, project } = assignment;
    if (resource.userId && resource.user) {
      notifyAssignmentAdded(
        resource.userId,
        resource.user.email,
        project.name,
        project.id,
      ).catch(console.error);
    }

    res.status(201).json({ data: assignment });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/assignments/:id
assignmentsRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignment = await prisma.assignment.update({
      where: { id: req.params.id as string },
      data: req.body,
      include: { resource: true, project: true, role: true },
    });
    await logAction(req.user!.id, 'update', 'assignment', assignment.id, req.body, req.ip);
    res.json({ data: assignment });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/assignments/:id (soft delete)
assignmentsRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id as string },
      include: {
        resource: { include: { user: true } },
        project: true,
      },
    });
    await prisma.assignment.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'assignment', req.params.id as string, {}, req.ip);

    // Notify only the resource being removed if they have a linked user account
    if (existing) {
      const { resource, project } = existing;
      if (resource.userId && resource.user) {
        notifyAssignmentRemoved(
          resource.userId,
          resource.user.email,
          project.name,
        ).catch(console.error);
      }
    }

    res.json({ message: 'Assignment deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
