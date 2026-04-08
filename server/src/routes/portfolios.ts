import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const portfoliosRouter = Router();
portfoliosRouter.use(requireAuth);

// GET /api/portfolios
portfoliosRouter.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { isActive: true },
    include: { programs: { where: { isActive: true }, select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ data: portfolios });
});

// POST /api/portfolios
portfoliosRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const portfolio = await prisma.portfolio.create({
      data: { name: b.name, description: b.description || null },
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
      data: { name: b.name ?? undefined, description: b.description ?? undefined },
    });
    await logAction(req.user!.id, 'update', 'portfolio', portfolio.id, {}, req.ip);
    res.json({ data: portfolio });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
