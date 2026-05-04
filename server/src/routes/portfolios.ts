import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const portfoliosRouter = Router();
portfoliosRouter.use(requireAuth);

const PORTFOLIO_INCLUDE = {
  programs: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      federalOwner: true,
      statusProjects: {
        where: { isActive: true },
        select: { id: true, status: true },
      },
    },
    orderBy: { name: 'asc' as const },
  },
};

// GET /api/portfolios
portfoliosRouter.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { isActive: true },
    include: PORTFOLIO_INCLUDE,
    orderBy: { name: 'asc' },
  });
  res.json({ data: portfolios });
});

// GET /api/portfolios/:id
portfoliosRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: req.params.id as string },
    include: PORTFOLIO_INCLUDE,
  });
  if (!portfolio) return next(new AppError('Portfolio not found', 404));
  res.json({ data: portfolio });
});

// POST /api/portfolios
portfoliosRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const portfolio = await prisma.portfolio.create({
      data: {
        name: b.name,
        description: b.description || null,
        owner: b.owner || null,
        budget: b.budget ? parseFloat(b.budget) : null,
      },
      include: PORTFOLIO_INCLUDE,
    });
    await logAction(req.user!.id, 'create', 'portfolio', portfolio.id, {}, req.ip);
    res.status(201).json({ data: portfolio });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/portfolios/:id
portfoliosRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const portfolio = await prisma.portfolio.update({
      where: { id: req.params.id as string },
      data: {
        name: b.name ?? undefined,
        description: b.description ?? undefined,
        owner: b.owner ?? undefined,
        budget: b.budget !== undefined ? (b.budget ? parseFloat(b.budget) : null) : undefined,
      },
      include: PORTFOLIO_INCLUDE,
    });
    await logAction(req.user!.id, 'update', 'portfolio', portfolio.id, {}, req.ip);
    res.json({ data: portfolio });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/portfolios/:id (soft delete)
portfoliosRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.portfolio.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'portfolio', req.params.id as string, {}, req.ip);
    res.json({ message: 'Portfolio deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
