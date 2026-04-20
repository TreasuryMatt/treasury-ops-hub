import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const programsRouter = Router();
programsRouter.use(requireAuth);

const PROGRAM_INCLUDE = {
  portfolio: { select: { id: true, name: true } },
  applications: {
    where: { isActive: true },
    include: { _count: { select: { statusProjects: true } } },
    orderBy: { name: 'asc' as const },
  },
  statusProjects: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      status: true,
      phase: true,
      nextUpdateDue: true,
      federalProductOwner: true,
      customerContact: true,
      applicationId: true,
      application: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' as const },
  },
};

// GET /api/programs
programsRouter.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  const programs = await prisma.program.findMany({
    where: { isActive: true },
    include: PROGRAM_INCLUDE,
    orderBy: { name: 'asc' },
  });
  res.json({ data: programs });
});

// GET /api/programs/:id
programsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const program = await prisma.program.findUnique({
    where: { id: req.params.id as string },
    include: PROGRAM_INCLUDE,
  });
  if (!program) return next(new AppError('Program not found', 404));
  res.json({ data: program });
});

// POST /api/programs
programsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const program = await prisma.program.create({
      data: {
        name: b.name,
        description: b.description || null,
        logoUrl: b.logoUrl || null,
        federalOwner: b.federalOwner || null,
        portfolioId: b.portfolioId || null,
      },
      include: PROGRAM_INCLUDE,
    });
    await logAction(req.user!.id, 'create', 'program', program.id, {}, req.ip);
    res.status(201).json({ data: program });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/programs/:id
programsRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const program = await prisma.program.update({
      where: { id: req.params.id as string },
      data: {
        name: b.name ?? undefined,
        description: b.description ?? undefined,
        logoUrl: b.logoUrl ?? undefined,
        federalOwner: b.federalOwner ?? undefined,
        portfolioId: b.portfolioId,
      },
      include: PROGRAM_INCLUDE,
    });
    await logAction(req.user!.id, 'update', 'program', program.id, {}, req.ip);
    res.json({ data: program });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/programs/:id (soft delete)
programsRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.program.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'program', req.params.id as string, {}, req.ip);
    res.json({ message: 'Program deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
