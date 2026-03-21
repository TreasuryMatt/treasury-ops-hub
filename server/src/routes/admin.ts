import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../services/prisma';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { importExcel } from '../services/import';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const adminRouter = Router();
adminRouter.use(requireAuth);

// ─── Dashboard stats ─────────────────────────────────────────────────────────
adminRouter.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  const [totalResources, federalCount, contractorCount, totalProjects, activeAssignments] = await Promise.all([
    prisma.resource.count({ where: { isActive: true } }),
    prisma.resource.count({ where: { isActive: true, resourceType: 'federal' } }),
    prisma.resource.count({ where: { isActive: true, resourceType: 'contractor' } }),
    prisma.project.count({ where: { isActive: true } }),
    prisma.assignment.count({ where: { isActive: true } }),
  ]);

  // Get resources with utilization
  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    include: { assignments: { where: { isActive: true }, select: { percentUtilized: true } } },
  });

  const utilizationData = resources.map((r) => ({
    totalUtilized: r.assignments.reduce((sum, a) => sum + a.percentUtilized, 0),
    division: r.division,
  }));

  const avgUtilization = utilizationData.length > 0
    ? utilizationData.reduce((sum, r) => sum + r.totalUtilized, 0) / utilizationData.length
    : 0;

  const availableResources = utilizationData.filter((r) => r.totalUtilized < 1).length;
  const overCapacity = utilizationData.filter((r) => r.totalUtilized > 1).length;

  // By division
  const byDivision = ['operations', 'engineering', 'pmso'].map((div) => {
    const divResources = utilizationData.filter((r) => r.division === div);
    return {
      division: div,
      count: divResources.length,
      avgUtilization: divResources.length > 0
        ? divResources.reduce((sum, r) => sum + r.totalUtilized, 0) / divResources.length
        : 0,
    };
  });

  res.json({
    data: {
      totalResources,
      federalCount,
      contractorCount,
      totalProjects,
      activeAssignments,
      avgUtilization,
      availableResources,
      overCapacity,
      byDivision,
    },
  });
});

// ─── Reference data: Roles ───────────────────────────────────────────────────
adminRouter.get('/roles', async (_req: AuthenticatedRequest, res: Response) => {
  const roles = await prisma.role.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ data: roles });
});

adminRouter.post('/roles', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const role = await prisma.role.create({ data: req.body });
    res.status(201).json({ data: role });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Reference data: Functional Areas ────────────────────────────────────────
adminRouter.get('/functional-areas', async (_req: AuthenticatedRequest, res: Response) => {
  const areas = await prisma.functionalArea.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ data: areas });
});

adminRouter.post('/functional-areas', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const area = await prisma.functionalArea.create({ data: req.body });
    res.status(201).json({ data: area });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Reference data: Products ────────────────────────────────────────────────
adminRouter.get('/products', async (_req: AuthenticatedRequest, res: Response) => {
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  res.json({ data: products });
});

adminRouter.post('/products', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json({ data: product });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Users ───────────────────────────────────────────────────────────────────
adminRouter.get('/users', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({ orderBy: { displayName: 'asc' } });
  res.json({ data: users });
});

adminRouter.post('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json({ data: user });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.put('/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id as string }, data: req.body });
    res.json({ data: user });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Import ──────────────────────────────────────────────────────────────
adminRouter.post('/import', requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      next(new AppError('No file uploaded', 400));
      return;
    }
    const result = await importExcel(req.file.buffer);
    res.json({ data: result });
  } catch (err: any) {
    next(new AppError(`Import failed: ${err.message}`, 400));
  }
});

// ─── Audit Log ───────────────────────────────────────────────────────────────
adminRouter.get('/audit-log', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit) || 50);

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.auditLog.count(),
  ]);

  res.json({ data, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
});
