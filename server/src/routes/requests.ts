import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor, requireManager } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const requestsRouter = Router();
requestsRouter.use(requireAuth);

const REQUEST_INCLUDE = {
  requestor: { select: { id: true, displayName: true, email: true } },
  project: { select: { id: true, name: true } },
  role: { select: { id: true, name: true } },
  functionalArea: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, displayName: true } },
};

// GET /api/requests
requestsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const isManagerOrAdmin = req.user!.isResourceManager || req.user!.role === 'manager' || req.user!.role === 'admin';

  const where: any = {};
  if (!isManagerOrAdmin) {
    where.requestorId = req.user!.id;
  }
  if (status && ['pending', 'approved', 'denied'].includes(status)) {
    where.status = status;
  }

  const requests = await prisma.resourceRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: requests });
});

// POST /api/requests
requestsRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const request = await prisma.resourceRequest.create({
      data: {
        requestorId: req.user!.id,
        projectId: b.projectId || null,
        projectOther: b.projectOther || null,
        resourceType: b.resourceType || null,
        roleId: b.roleId || null,
        functionalAreaId: b.functionalAreaId || null,
        percentNeeded: b.percentNeeded ? parseInt(b.percentNeeded) : null,
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        notes: b.notes || null,
      },
      include: REQUEST_INCLUDE,
    });
    await logAction(req.user!.id, 'create', 'resource_request', request.id, {}, req.ip);
    res.status(201).json({ data: request });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/requests/:id/review
requestsRouter.put('/:id/review', requireManager, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, reviewNote, resourceId } = req.body;
    if (!['approved', 'denied'].includes(status)) {
      return next(new AppError('Status must be approved or denied', 400));
    }

    const [request] = await prisma.$transaction(async (tx) => {
      const updated = await tx.resourceRequest.update({
        where: { id: req.params.id as string },
        data: {
          status,
          reviewNote: reviewNote || null,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
        include: REQUEST_INCLUDE,
      });

      // If approving with a resource and a real project, create the assignment
      if (status === 'approved' && resourceId && updated.projectId) {
        try {
          await tx.assignment.create({
            data: {
              resourceId,
              projectId: updated.projectId,
              roleId: updated.roleId || null,
              percentUtilized: updated.percentNeeded ? updated.percentNeeded / 100 : 0,
              startDate: updated.startDate || null,
              endDate: updated.endDate || null,
              notes: 'Assigned via resource request',
            },
          });
        } catch (e: any) {
          // P2002 = unique constraint violation — assignment already exists, skip
          if (e.code !== 'P2002') throw e;
        }
      }

      return [updated];
    });

    await logAction(req.user!.id, `request_${status}`, 'resource_request', request.id, { reviewNote, resourceId }, req.ip);
    res.json({ data: request });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/requests/:id
requestsRouter.delete('/:id', requireManager, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.resourceRequest.delete({ where: { id: req.params.id as string } });
    await logAction(req.user!.id, 'delete', 'resource_request', req.params.id as string, {}, req.ip);
    res.json({ message: 'Request deleted' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
