import { Router, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const risksRouter = Router();
risksRouter.use(requireAuth);

const RISK_LIST_INCLUDE = {
  program: { select: { id: true, name: true, federalOwner: true } },
  statusProject: { select: { id: true, name: true, programId: true } },
  category: { select: { id: true, name: true } },
  submitter: { select: { id: true, displayName: true, email: true } },
  _count: { select: { comments: true, mitigationActions: true } },
};

const RISK_DETAIL_INCLUDE = {
  ...RISK_LIST_INCLUDE,
  comments: {
    include: { author: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  mitigationActions: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
};

async function validateProgramProject(programId: string, statusProjectId: string) {
  const project = await prisma.statusProject.findFirst({
    where: {
      id: statusProjectId,
      programId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!project) {
    throw new AppError('Project impacted must belong to the selected program', 400);
  }
}

function normalizeMitigationActions(actions: any[] | undefined) {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((action) => action && typeof action.title === 'string' && action.title.trim())
    .map((action, index) => ({
      title: action.title.trim(),
      dueDate: action.dueDate ? new Date(action.dueDate) : null,
      status: action.status || 'yellow',
      sortOrder: index,
    }));
}

async function nextRiskCode(tx: Prisma.TransactionClient) {
  const latest = await tx.risk.findFirst({
    orderBy: { riskCode: 'desc' },
    select: { riskCode: true },
  });

  const current = latest?.riskCode ? parseInt(latest.riskCode.replace(/^RISK-/, ''), 10) : 0;
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `RISK-${String(next).padStart(4, '0')}`;
}

// GET /api/risks
risksRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const {
    search,
    programId,
    projectId,
    progress,
    criticality,
    categoryId,
    sortBy = 'dateIdentified',
    sortDir = 'desc',
  } = req.query as Record<string, string>;

  const where: any = {};

  if (search) {
    where.OR = [
      { riskCode: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { statement: { contains: search, mode: 'insensitive' } },
      { spmId: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (programId) where.programId = programId;
  if (projectId) where.statusProjectId = projectId;
  if (progress) where.progress = progress;
  if (criticality) where.criticality = criticality;
  if (categoryId) where.categoryId = categoryId;

  const sortOrder = sortDir === 'asc' ? 'asc' : 'desc';
  const sortableFields: Record<string, any> = {
    riskCode: { riskCode: sortOrder },
    title: { title: sortOrder },
    program: { program: { name: sortOrder } },
    project: { statusProject: { name: sortOrder } },
    category: { category: { name: sortOrder } },
    progress: { progress: sortOrder },
    criticality: { criticality: sortOrder },
    dateIdentified: { dateIdentified: sortOrder },
    createdAt: { createdAt: sortOrder },
  };

  const risks = await prisma.risk.findMany({
    where,
    include: RISK_LIST_INCLUDE,
    orderBy: sortableFields[sortBy] ?? { dateIdentified: 'desc' },
  });

  res.json({ data: risks });
});

// GET /api/risks/:id
risksRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const risk = await prisma.risk.findUnique({
    where: { id: req.params.id as string },
    include: RISK_DETAIL_INCLUDE,
  });

  if (!risk) return next(new AppError('Risk not found', 404));
  res.json({ data: risk });
});

// POST /api/risks
risksRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    if (!b.programId || !b.statusProjectId || !b.categoryId || !b.title || !b.statement || !b.criticality) {
      throw new AppError('Program, project, category, title, statement, and criticality are required', 400);
    }

    await validateProgramProject(b.programId, b.statusProjectId);
    const mitigationActions = normalizeMitigationActions(b.mitigationActions);

    const risk = await prisma.$transaction(async (tx) => {
      const riskCode = await nextRiskCode(tx);

      return tx.risk.create({
        data: {
          riskCode,
          progress: b.progress || 'open',
          programId: b.programId,
          statusProjectId: b.statusProjectId,
          categoryId: b.categoryId,
          spmId: b.spmId || null,
          title: b.title.trim(),
          statement: b.statement.trim(),
          criticality: b.criticality,
          submitterId: req.user!.id,
          dateIdentified: b.dateIdentified ? new Date(b.dateIdentified) : null,
          probability: b.probability ?? null,
          impact: b.impact || null,
          impactDate: b.impactDate ? new Date(b.impactDate) : null,
          closureCriteria: b.closureCriteria || null,
          mitigationActions: mitigationActions.length > 0 ? { createMany: { data: mitigationActions } } : undefined,
        },
        include: RISK_DETAIL_INCLUDE,
      });
    });

    await logAction(req.user!.id, 'create', 'risk', risk.id, { riskCode: risk.riskCode }, req.ip);
    res.status(201).json({ data: risk });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/risks/:id
risksRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const existing = await prisma.risk.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, programId: true, statusProjectId: true },
    });

    if (!existing) throw new AppError('Risk not found', 404);

    const nextProgramId = b.programId ?? existing.programId;
    const nextProjectId = b.statusProjectId ?? existing.statusProjectId;
    await validateProgramProject(nextProgramId, nextProjectId);

    const mitigationActions = b.mitigationActions === undefined ? undefined : normalizeMitigationActions(b.mitigationActions);

    const risk = await prisma.$transaction(async (tx) => {
      if (mitigationActions !== undefined) {
        await tx.riskMitigationAction.deleteMany({ where: { riskId: existing.id } });
      }

      return tx.risk.update({
        where: { id: existing.id },
        data: {
          progress: b.progress ?? undefined,
          programId: b.programId ?? undefined,
          statusProjectId: b.statusProjectId ?? undefined,
          categoryId: b.categoryId ?? undefined,
          spmId: b.spmId !== undefined ? (b.spmId || null) : undefined,
          title: b.title !== undefined ? String(b.title).trim() : undefined,
          statement: b.statement !== undefined ? String(b.statement).trim() : undefined,
          criticality: b.criticality ?? undefined,
          dateIdentified: b.dateIdentified !== undefined ? (b.dateIdentified ? new Date(b.dateIdentified) : null) : undefined,
          probability: b.probability !== undefined ? b.probability : undefined,
          impact: b.impact !== undefined ? (b.impact || null) : undefined,
          impactDate: b.impactDate !== undefined ? (b.impactDate ? new Date(b.impactDate) : null) : undefined,
          closureCriteria: b.closureCriteria !== undefined ? (b.closureCriteria || null) : undefined,
          mitigationActions: mitigationActions && mitigationActions.length > 0 ? { createMany: { data: mitigationActions } } : undefined,
        },
        include: RISK_DETAIL_INCLUDE,
      });
    });

    await logAction(req.user!.id, 'update', 'risk', risk.id, { riskCode: risk.riskCode }, req.ip);
    res.json({ data: risk });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// POST /api/risks/:id/comments
risksRouter.post('/:id/comments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) throw new AppError('Comment text is required', 400);

    const risk = await prisma.risk.findUnique({ where: { id: req.params.id as string }, select: { id: true, riskCode: true } });
    if (!risk) throw new AppError('Risk not found', 404);

    const comment = await prisma.riskComment.create({
      data: {
        riskId: risk.id,
        authorId: req.user!.id,
        text,
      },
      include: { author: { select: { id: true, displayName: true } } },
    });

    await logAction(req.user!.id, 'create', 'risk_comment', comment.id, { riskId: risk.id, riskCode: risk.riskCode }, req.ip);
    res.status(201).json({ data: comment });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
