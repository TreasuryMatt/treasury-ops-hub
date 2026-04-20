import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

const APPLICATION_INCLUDE = {
  program: { select: { id: true, name: true } },
  _count: { select: { statusProjects: true } },
};

applicationsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { programId } = req.query as Record<string, string>;

  const data = await prisma.application.findMany({
    where: {
      isActive: true,
      ...(programId ? { programId } : {}),
    },
    include: APPLICATION_INCLUDE,
    orderBy: [{ program: { name: 'asc' } }, { name: 'asc' }],
  });

  res.json({ data });
});

applicationsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const application = await prisma.application.findUnique({
    where: { id: req.params.id as string },
    include: APPLICATION_INCLUDE,
  });

  if (!application || !application.isActive) return next(new AppError('Application not found', 404));
  res.json({ data: application });
});

applicationsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;

    const application = await prisma.application.create({
      data: {
        name: b.name,
        description: b.description || null,
        programId: b.programId,
      },
      include: APPLICATION_INCLUDE,
    });

    await logAction(req.user!.id, 'create', 'application', application.id, {}, req.ip);
    res.status(201).json({ data: application });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

applicationsRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;

    const application = await prisma.application.update({
      where: { id: req.params.id as string },
      data: {
        name: b.name ?? undefined,
        description: b.description !== undefined ? (b.description || null) : undefined,
        programId: b.programId ?? undefined,
      },
      include: APPLICATION_INCLUDE,
    });

    await logAction(req.user!.id, 'update', 'application', application.id, {}, req.ip);
    res.json({ data: application });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

applicationsRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    await prisma.$transaction([
      prisma.statusProject.updateMany({ where: { applicationId: id }, data: { applicationId: null } }),
      prisma.application.update({ where: { id }, data: { isActive: false } }),
    ]);

    await logAction(req.user!.id, 'delete', 'application', id, {}, req.ip);
    res.json({ message: 'Application deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
