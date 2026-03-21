import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const resourcesRouter = Router();
resourcesRouter.use(requireAuth);

const RESOURCE_INCLUDE = {
  functionalArea: true,
  primaryRole: true,
  secondaryRole: true,
  supervisor: { select: { id: true, firstName: true, lastName: true } },
  secondLineSupervisor: { select: { id: true, firstName: true, lastName: true } },
  assignments: {
    where: { isActive: true },
    include: { project: { include: { product: true } }, role: true },
  },
};

// GET /api/resources/supervisors — list only resources marked as supervisors
resourcesRouter.get('/supervisors', async (_req: AuthenticatedRequest, res: Response) => {
  const supervisors = await prisma.resource.findMany({
    where: { isSupervisor: true, isActive: true },
    select: { id: true, firstName: true, lastName: true, division: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  res.json({ data: supervisors });
});

// GET /api/resources
resourcesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '50', search, division, resourceType, functionalAreaId, roleId, available } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { isActive: true };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (division) where.division = division;
  if (resourceType) where.resourceType = resourceType;
  if (functionalAreaId) where.functionalAreaId = functionalAreaId;
  if (roleId) where.primaryRoleId = roleId;
  if (available === 'true') where.availableForWork = true;

  const { sortBy = 'lastName', sortDir = 'asc' } = req.query as Record<string, string>;
  const validSortFields: Record<string, any> = {
    lastName: [{ lastName: sortDir }, { firstName: 'asc' }],
    firstName: [{ firstName: sortDir }, { lastName: 'asc' }],
    division: [{ division: sortDir }, { lastName: 'asc' }],
    functionalArea: [{ functionalArea: { name: sortDir } }, { lastName: 'asc' }],
    primaryRole: [{ primaryRole: { name: sortDir } }, { lastName: 'asc' }],
    supervisor: [{ supervisor: { lastName: sortDir } }, { lastName: 'asc' }],
    resourceType: [{ resourceType: sortDir }, { lastName: 'asc' }],
  };
  const orderBy = validSortFields[sortBy] ?? validSortFields.lastName;

  const [data, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: RESOURCE_INCLUDE,
      skip,
      take: limitNum,
      orderBy,
    }),
    prisma.resource.count({ where }),
  ]);

  const enriched = data.map((r) => {
    const totalUtilized = r.assignments.reduce((sum, a) => sum + a.percentUtilized, 0);
    return { ...r, totalPercentUtilized: totalUtilized, availableCapacity: 1 - totalUtilized };
  });

  res.json({ data: enriched, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
});

// GET /api/resources/:id
resourcesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const resource = await prisma.resource.findUnique({
    where: { id: req.params.id as string },
    include: RESOURCE_INCLUDE,
  });
  if (!resource) { next(new AppError('Resource not found', 404)); return; }

  const totalUtilized = resource.assignments.reduce((sum, a) => sum + a.percentUtilized, 0);
  res.json({ data: { ...resource, totalPercentUtilized: totalUtilized, availableCapacity: 1 - totalUtilized } });
});

// POST /api/resources
resourcesRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const resource = await prisma.resource.create({ data: req.body, include: RESOURCE_INCLUDE });
    await logAction(req.user!.id, 'create', 'resource', resource.id, req.body, req.ip);
    res.status(201).json({ data: resource });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/resources/:id
resourcesRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const resource = await prisma.resource.update({
      where: { id: req.params.id as string },
      data: req.body,
      include: RESOURCE_INCLUDE,
    });
    await logAction(req.user!.id, 'update', 'resource', resource.id, req.body, req.ip);
    res.json({ data: resource });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/resources/:id (soft delete)
resourcesRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.resource.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'resource', req.params.id as string, {}, req.ip);
    res.json({ message: 'Resource deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
