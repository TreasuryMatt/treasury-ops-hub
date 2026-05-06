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
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [totalResources, federalCount, contractorCount, totalProjects, activeAssignments, endingSoonProjects] = await Promise.all([
    prisma.resource.count({ where: { isActive: true } }),
    prisma.resource.count({ where: { isActive: true, resourceType: 'federal' } }),
    prisma.resource.count({ where: { isActive: true, resourceType: 'contractor' } }),
    prisma.project.count({ where: { isActive: true } }),
    prisma.assignment.count({ where: { isActive: true } }),
    prisma.project.count({ where: { isActive: true, endDate: { gte: now, lte: thirtyDaysFromNow } } }),
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
      endingSoonProjects,
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
    const { name, sortOrder } = req.body;
    const role = await prisma.role.create({ data: { name, sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0 } });
    res.status(201).json({ data: role });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.get('/roles/:id/usage', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const [primary, secondary, assignments] = await Promise.all([
      prisma.resource.count({ where: { primaryRoleId: id } }),
      prisma.resource.count({ where: { secondaryRoleId: id } }),
      prisma.assignment.count({ where: { roleId: id } }),
    ]);
    const items = [
      { label: 'resources (primary role)', count: primary },
      { label: 'resources (secondary role)', count: secondary },
      { label: 'assignments', count: assignments },
    ].filter((i) => i.count > 0);
    res.json({ data: items });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.put('/roles/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, sortOrder } = req.body;
    const role = await prisma.role.update({ where: { id: req.params.id as string }, data: { name, sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined } });
    res.json({ data: role });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.delete('/roles/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction([
      prisma.resource.updateMany({ where: { primaryRoleId: id }, data: { primaryRoleId: null } }),
      prisma.resource.updateMany({ where: { secondaryRoleId: id }, data: { secondaryRoleId: null } }),
      prisma.assignment.updateMany({ where: { roleId: id }, data: { roleId: null } }),
      prisma.role.delete({ where: { id } }),
    ]);
    res.json({ message: 'Deleted' });
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

adminRouter.get('/functional-areas/:id/usage', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.resource.count({ where: { functionalAreaId: req.params.id as string } });
    res.json({ data: count > 0 ? [{ label: 'resources', count }] : [] });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.put('/functional-areas/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const area = await prisma.functionalArea.update({ where: { id: req.params.id as string }, data: req.body });
    res.json({ data: area });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.delete('/functional-areas/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction([
      prisma.resource.updateMany({ where: { functionalAreaId: id }, data: { functionalAreaId: null } }),
      prisma.functionalArea.delete({ where: { id } }),
    ]);
    res.json({ message: 'Deleted' });
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

adminRouter.get('/products/:id/usage', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.project.count({ where: { productId: req.params.id as string } });
    res.json({ data: count > 0 ? [{ label: 'projects', count }] : [] });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.put('/products/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id as string }, data: req.body });
    res.json({ data: product });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.delete('/products/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction([
      prisma.project.updateMany({ where: { productId: id }, data: { productId: null } }),
      prisma.product.delete({ where: { id } }),
    ]);
    res.json({ message: 'Deleted' });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Reference data: Phases ──────────────────────────────────────────────────
adminRouter.get('/phases', async (_req: AuthenticatedRequest, res: Response) => {
  const phases = await prisma.statusPhase.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ data: phases });
});

adminRouter.post('/phases', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, sortOrder } = req.body;
    const phase = await prisma.statusPhase.create({ data: { name, sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0 } });
    res.status(201).json({ data: phase });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.get('/phases/:id/usage', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.statusProject.count({ where: { phaseId: req.params.id as string } });
    res.json({ data: count > 0 ? [{ label: 'status projects', count }] : [] });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.put('/phases/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, sortOrder } = req.body;
    const phase = await prisma.statusPhase.update({ where: { id: req.params.id as string }, data: { name, sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined } });
    res.json({ data: phase });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.delete('/phases/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction([
      prisma.statusProject.updateMany({ where: { phaseId: id }, data: { phaseId: null } }),
      prisma.statusPhase.delete({ where: { id } }),
    ]);
    res.json({ message: 'Deleted' });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Reference data: Risk Categories ────────────────────────────────────────
adminRouter.get('/risk-categories', async (_req: AuthenticatedRequest, res: Response) => {
  const categories = await prisma.riskCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  res.json({ data: categories });
});

adminRouter.post('/risk-categories', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, sortOrder } = req.body;
    const category = await prisma.riskCategory.create({
      data: {
        name,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0,
      },
    });
    res.status(201).json({ data: category });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.get('/risk-categories/:id/usage', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.risk.count({ where: { categoryId: req.params.id as string } });
    res.json({ data: count > 0 ? [{ label: 'risks', count }] : [] });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.put('/risk-categories/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, sortOrder, isActive } = req.body;
    const category = await prisma.riskCategory.update({
      where: { id: req.params.id as string },
      data: {
        name,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
    res.json({ data: category });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

adminRouter.delete('/risk-categories/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.riskCategory.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Users ───────────────────────────────────────────────────────────────────
adminRouter.get('/users', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { displayName: 'asc' },
    include: { resource: { select: { id: true, firstName: true, lastName: true } } },
  });
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

adminRouter.delete('/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    res.json({ data: user });
  } catch (err: any) { next(new AppError(err.message, 400)); }
});

// ─── Onboard Staff (creates User + Resource atomically) ───────────────────────
adminRouter.post('/onboard-staff', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { user: u, resource: r } = req.body;
    const toBoolean = (v: any): boolean => v === true || v === 'true' || v === 'on';
    const toNullableBoolean = (v: any): boolean | null => v == null ? null : toBoolean(v);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: u });
      const resource = await tx.resource.create({
        data: {
          resourceType: r.resourceType,
          firstName: r.firstName,
          lastName: r.lastName,
          division: r.division,
          functionalAreaId: r.functionalAreaId || null,
          primaryRoleId: r.primaryRoleId || null,
          secondaryRoleId: r.secondaryRoleId || null,
          supervisorId: r.supervisorId || null,
          secondLineSupervisorId: r.secondLineSupervisorId || null,
          opsEngLead: r.opsEngLead || null,
          gsLevel: r.resourceType === 'federal' ? r.gsLevel || null : null,
          isMatrixed: r.resourceType === 'federal' ? toNullableBoolean(r.isMatrixed) : null,
          popStartDate: r.resourceType === 'contractor' && r.popStartDate ? new Date(r.popStartDate) : null,
          popEndDate: r.resourceType === 'contractor' && r.popEndDate ? new Date(r.popEndDate) : null,
          popAlertDaysBefore: r.resourceType === 'contractor' && r.popAlertDaysBefore ? parseInt(r.popAlertDaysBefore, 10) : null,
          isSupervisor: toBoolean(r.isSupervisor),
          availableForWork: toBoolean(r.availableForWork),
          notes: r.notes || null,
          userId: user.id,
        },
      });
      return { user, resource };
    });

    res.status(201).json({ data: result });
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
