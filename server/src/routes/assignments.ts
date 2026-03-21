import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

// POST /api/assignments
assignmentsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignment = await prisma.assignment.create({
      data: req.body,
      include: { resource: true, project: true, role: true },
    });
    await logAction(req.user!.id, 'create', 'assignment', assignment.id, req.body, req.ip);
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
    await prisma.assignment.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'assignment', req.params.id as string, {}, req.ip);
    res.json({ message: 'Assignment deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
