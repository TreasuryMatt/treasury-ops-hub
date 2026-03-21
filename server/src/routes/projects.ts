import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const PROJECT_INCLUDE = {
  product: true,
  assignments: {
    where: { isActive: true },
    include: { resource: true, role: true },
  },
};

// GET /api/projects
projectsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '50', search, status, priority, productId } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { isActive: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (productId) where.productId = productId;

  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, include: PROJECT_INCLUDE, skip, take: limitNum, orderBy: { name: 'asc' } }),
    prisma.project.count({ where }),
  ]);

  const enriched = data.map((p) => ({
    ...p,
    teamSize: p.assignments.length,
    totalUtilization: p.assignments.reduce((sum, a) => sum + a.percentUtilized, 0),
  }));

  res.json({ data: enriched, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string }, include: PROJECT_INCLUDE });
  if (!project) { next(new AppError('Project not found', 404)); return; }
  res.json({ data: { ...project, teamSize: project.assignments.length } });
});

// POST /api/projects
projectsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.create({ data: req.body, include: PROJECT_INCLUDE });
    await logAction(req.user!.id, 'create', 'project', project.id, req.body, req.ip);
    res.status(201).json({ data: project });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/projects/:id
projectsRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.update({ where: { id: req.params.id as string }, data: req.body, include: PROJECT_INCLUDE });
    await logAction(req.user!.id, 'update', 'project', project.id, req.body, req.ip);
    res.json({ data: project });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/projects/:id (soft delete)
projectsRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.project.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'project', req.params.id as string, {}, req.ip);
    res.json({ message: 'Project deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
