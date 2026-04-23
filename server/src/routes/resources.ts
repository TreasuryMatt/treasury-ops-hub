import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
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
  const { page = '1', limit = '50', search, division, resourceType, functionalAreaId, roleId, available, popEndWithinDays } = req.query as Record<string, string>;
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
  if (popEndWithinDays) {
    const days = Math.max(0, parseInt(popEndWithinDays, 10) || 0);
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    where.popEndDate = { gte: now, lte: end };
  }

  const { sortBy = 'lastName', sortDir = 'asc' } = req.query as Record<string, string>;
  const validSortFields: Record<string, any> = {
    lastName: [{ lastName: sortDir }, { firstName: 'asc' }],
    firstName: [{ firstName: sortDir }, { lastName: 'asc' }],
    division: [{ division: sortDir }, { lastName: 'asc' }],
    functionalArea: [{ functionalArea: { name: sortDir } }, { lastName: 'asc' }],
    primaryRole: [{ primaryRole: { name: sortDir } }, { lastName: 'asc' }],
    supervisor: [{ supervisor: { lastName: sortDir } }, { lastName: 'asc' }],
    resourceType: [{ resourceType: sortDir }, { lastName: 'asc' }],
    popEndDate: [{ popEndDate: sortDir }, { lastName: 'asc' }],
  };

  // Utilization/capacity are computed fields — sort in memory after fetching all matches
  if (sortBy === 'totalPercentUtilized' || sortBy === 'availableCapacity') {
    const allData = await prisma.resource.findMany({ where, include: RESOURCE_INCLUDE });
    const enriched = allData.map((r) => {
      const totalUtilized = r.assignments.reduce((sum, a) => sum + a.percentUtilized, 0);
      return { ...r, totalPercentUtilized: totalUtilized, availableCapacity: 1 - totalUtilized };
    });
    enriched.sort((a, b) => {
      const field = sortBy === 'availableCapacity' ? 'availableCapacity' : 'totalPercentUtilized';
      return sortDir === 'asc' ? a[field] - b[field] : b[field] - a[field];
    });
    const paginated = enriched.slice(skip, skip + limitNum);
    return res.json({ data: paginated, meta: { total: allData.length, page: pageNum, limit: limitNum, pages: Math.ceil(allData.length / limitNum) } });
  }

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
    const b = req.body;
    const toBoolean = (v: any): boolean => v === true || v === 'true' || v === 'on';
    const toBooleanOrNull = (v: any): boolean | null => v == null ? null : toBoolean(v);

    const data: any = {
      resourceType: b.resourceType,
      firstName: b.firstName,
      lastName: b.lastName,
      division: b.division,
      functionalAreaId: b.functionalAreaId || null,
      opsEngLead: b.opsEngLead || null,
      supervisorId: b.supervisorId || null,
      secondLineSupervisorId: b.secondLineSupervisorId || null,
      gsLevel: b.gsLevel || null,
      isMatrixed: toBooleanOrNull(b.isMatrixed),
      isSupervisor: toBoolean(b.isSupervisor),
      popStartDate: b.popStartDate ? new Date(b.popStartDate) : null,
      popEndDate: b.popEndDate ? new Date(b.popEndDate) : null,
      primaryRoleId: b.primaryRoleId || null,
      secondaryRoleId: b.secondaryRoleId || null,
      availableForWork: toBoolean(b.availableForWork),
      notes: b.notes || null,
    };

    const resource = await prisma.resource.create({ data, include: RESOURCE_INCLUDE });
    await logAction(req.user!.id, 'create', 'resource', resource.id, data, req.ip);
    res.status(201).json({ data: resource });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/resources/:id
resourcesRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const toBoolean = (v: any): boolean => v === true || v === 'true' || v === 'on';
    const toBooleanOrNull = (v: any): boolean | null => v == null ? null : toBoolean(v);

    const data: any = {};
    if (b.resourceType !== undefined) data.resourceType = b.resourceType;
    if (b.firstName !== undefined) data.firstName = b.firstName;
    if (b.lastName !== undefined) data.lastName = b.lastName;
    if (b.division !== undefined) data.division = b.division;
    if (b.functionalAreaId !== undefined) data.functionalAreaId = b.functionalAreaId || null;
    if (b.opsEngLead !== undefined) data.opsEngLead = b.opsEngLead || null;
    if (b.supervisorId !== undefined) data.supervisorId = b.supervisorId || null;
    if (b.secondLineSupervisorId !== undefined) data.secondLineSupervisorId = b.secondLineSupervisorId || null;
    if (b.gsLevel !== undefined) data.gsLevel = b.gsLevel || null;
    if (b.isMatrixed !== undefined) data.isMatrixed = toBooleanOrNull(b.isMatrixed);
    if (b.isSupervisor !== undefined) data.isSupervisor = toBoolean(b.isSupervisor);
    if (b.popStartDate !== undefined) data.popStartDate = b.popStartDate ? new Date(b.popStartDate) : null;
    if (b.popEndDate !== undefined) data.popEndDate = b.popEndDate ? new Date(b.popEndDate) : null;
    if (b.primaryRoleId !== undefined) data.primaryRoleId = b.primaryRoleId || null;
    if (b.secondaryRoleId !== undefined) data.secondaryRoleId = b.secondaryRoleId || null;
    if (b.availableForWork !== undefined) data.availableForWork = toBoolean(b.availableForWork);
    if (b.notes !== undefined) data.notes = b.notes || null;

    const resource = await prisma.resource.update({
      where: { id: req.params.id as string },
      data,
      include: RESOURCE_INCLUDE,
    });
    await logAction(req.user!.id, 'update', 'resource', resource.id, data, req.ip);
    res.json({ data: resource });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/resources/:id (soft delete)
resourcesRouter.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.resource.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'resource', req.params.id as string, {}, req.ip);
    res.json({ message: 'Resource deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
