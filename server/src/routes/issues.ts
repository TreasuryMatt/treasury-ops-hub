import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const issuesRouter = Router();
issuesRouter.use(requireAuth);

const ISSUE_LIST_INCLUDE = {
  program: { select: { id: true, name: true, federalOwner: true } },
  statusProject: { select: { id: true, name: true, programId: true } },
  category: { select: { id: true, name: true } },
  submitter: { select: { id: true, displayName: true, email: true } },
  _count: { select: { comments: true, mitigationActions: true } },
};

const ISSUE_DETAIL_INCLUDE = {
  ...ISSUE_LIST_INCLUDE,
  comments: {
    include: { author: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  mitigationActions: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
};

// Automatically escalate any open risks whose impact date has passed.
async function autoEscalateOverdueRisks() {
  const now = new Date();
  await prisma.risk.updateMany({
    where: {
      progress: 'open',
      impactDate: { lte: now },
    },
    data: {
      progress: 'escalated_to_issue',
      escalatedAt: now,
    },
  });
}

// GET /api/issues
issuesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  await autoEscalateOverdueRisks();

  const { search, programId, projectId, criticality, sortBy = 'escalatedAt', sortDir = 'desc' } = req.query as Record<string, string>;

  const where: any = { progress: 'escalated_to_issue' };

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
  if (criticality) where.criticality = criticality;

  const sortOrder = sortDir === 'asc' ? 'asc' : 'desc';
  const sortableFields: Record<string, any> = {
    riskCode: { riskCode: sortOrder },
    title: { title: sortOrder },
    program: { program: { name: sortOrder } },
    project: { statusProject: { name: sortOrder } },
    criticality: { criticality: sortOrder },
    escalatedAt: { escalatedAt: sortOrder },
    impactDate: { impactDate: sortOrder },
  };

  const issues = await prisma.risk.findMany({
    where,
    include: ISSUE_LIST_INCLUDE,
    orderBy: sortableFields[sortBy] ?? { escalatedAt: 'desc' },
  });

  res.json({ data: issues });
});

// GET /api/issues/dashboard
issuesRouter.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  await autoEscalateOverdueRisks();

  const ESCALATED = { progress: 'escalated_to_issue' as const };

  const [totalIssues, criticalityGroups, programGroups] = await Promise.all([
    prisma.risk.count({ where: ESCALATED }),
    prisma.risk.groupBy({ by: ['criticality'], where: ESCALATED, _count: { id: true } }),
    prisma.program.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        risks: { where: ESCALATED, select: { id: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const byCriticality = Object.fromEntries(criticalityGroups.map((g) => [g.criticality, g._count.id]));

  const byProgram = programGroups
    .filter((p) => p.risks.length > 0)
    .map((p) => ({ id: p.id, name: p.name, count: p.risks.length }));

  res.json({
    data: {
      totalIssues,
      byCriticality: {
        critical: byCriticality['critical'] ?? 0,
        high: byCriticality['high'] ?? 0,
        moderate: byCriticality['moderate'] ?? 0,
        low: byCriticality['low'] ?? 0,
      },
      byProgram,
    },
  });
});

// GET /api/issues/:id
issuesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const issue = await prisma.risk.findUnique({
    where: { id: req.params.id as string },
    include: ISSUE_DETAIL_INCLUDE,
  });

  if (!issue) return next(new AppError('Issue not found', 404));
  if (issue.progress !== 'escalated_to_issue') return next(new AppError('This risk has not been escalated to an issue', 400));

  res.json({ data: issue });
});

// PUT /api/issues/:id — edit an issue (delegates to full risk update logic)
issuesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const existing = await prisma.risk.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, progress: true, escalatedAt: true, programId: true, statusProjectId: true, riskCode: true },
    });

    if (!existing) throw new AppError('Issue not found', 404);
    if (existing.progress !== 'escalated_to_issue') throw new AppError('This risk has not been escalated to an issue', 400);

    // Validate program/project pairing if either is changing
    const nextProgramId = b.programId ?? existing.programId;
    const nextProjectId = b.statusProjectId ?? existing.statusProjectId;
    if (nextProgramId !== existing.programId || nextProjectId !== existing.statusProjectId) {
      const project = await prisma.statusProject.findFirst({
        where: { id: nextProjectId, programId: nextProgramId, isActive: true },
        select: { id: true },
      });
      if (!project) throw new AppError('Project impacted must belong to the selected program', 400);
    }

    // Determine escalatedAt update
    const newProgress = b.progress ?? 'escalated_to_issue';
    const escalatedAt =
      newProgress === 'escalated_to_issue'
        ? existing.escalatedAt ?? new Date()
        : null;

    const issue = await prisma.risk.update({
      where: { id: existing.id },
      data: {
        progress: newProgress,
        escalatedAt,
        programId: b.programId ?? undefined,
        statusProjectId: b.statusProjectId ?? undefined,
        categoryId: b.categoryId ?? undefined,
        spmId: b.spmId !== undefined ? (b.spmId || null) : undefined,
        title: b.title !== undefined ? String(b.title).trim() : undefined,
        statement: b.statement !== undefined ? String(b.statement).trim() : undefined,
        criticality: b.criticality ?? undefined,
        dateIdentified: b.dateIdentified !== undefined ? (b.dateIdentified ? new Date(b.dateIdentified) : null) : undefined,
        impact: b.impact !== undefined ? (b.impact || null) : undefined,
        impactDate: b.impactDate !== undefined ? (b.impactDate ? new Date(b.impactDate) : null) : undefined,
        closureCriteria: b.closureCriteria !== undefined ? (b.closureCriteria || null) : undefined,
      },
      include: ISSUE_DETAIL_INCLUDE,
    });

    await logAction(req.user!.id, 'update', 'issue', issue.id, { riskCode: issue.riskCode }, req.ip);
    res.json({ data: issue });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// POST /api/issues/:id/comments
issuesRouter.post('/:id/comments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) throw new AppError('Comment text is required', 400);

    const issue = await prisma.risk.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, riskCode: true, progress: true },
    });
    if (!issue) throw new AppError('Issue not found', 404);
    if (issue.progress !== 'escalated_to_issue') throw new AppError('This risk has not been escalated to an issue', 400);

    const comment = await prisma.riskComment.create({
      data: { riskId: issue.id, authorId: req.user!.id, text },
      include: { author: { select: { id: true, displayName: true } } },
    });

    await logAction(req.user!.id, 'create', 'issue_comment', comment.id, { riskId: issue.id, riskCode: issue.riskCode }, req.ip);
    res.status(201).json({ data: comment });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// POST /api/issues/:id/mitigation-actions
issuesRouter.post('/:id/mitigation-actions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const issue = await prisma.risk.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, progress: true, impactDate: true },
    });
    if (!issue) throw new AppError('Issue not found', 404);
    if (issue.progress !== 'escalated_to_issue') throw new AppError('This risk has not been escalated to an issue', 400);

    const { title, dueDate, status } = req.body;
    if (!title || !String(title).trim()) throw new AppError('Title is required', 400);

    if (dueDate && issue.impactDate && new Date(dueDate) > new Date(issue.impactDate)) {
      throw new AppError("Due date cannot be after the risk's impact date", 400);
    }

    const count = await prisma.riskMitigationAction.count({ where: { riskId: issue.id } });
    const action = await prisma.riskMitigationAction.create({
      data: {
        riskId: issue.id,
        title: String(title).trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'yellow',
        sortOrder: count,
      },
    });

    res.status(201).json({ data: action });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/issues/:id/mitigation-actions/:actionId
issuesRouter.put('/:id/mitigation-actions/:actionId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const issue = await prisma.risk.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, progress: true, impactDate: true },
    });
    if (!issue) throw new AppError('Issue not found', 404);
    if (issue.progress !== 'escalated_to_issue') throw new AppError('This risk has not been escalated to an issue', 400);

    const existing = await prisma.riskMitigationAction.findFirst({
      where: { id: req.params.actionId as string, riskId: issue.id },
    });
    if (!existing) throw new AppError('Mitigation action not found', 404);

    const { title, dueDate, status, isComplete } = req.body;
    const nextDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate;
    if (nextDueDate && issue.impactDate && nextDueDate > new Date(issue.impactDate)) {
      throw new AppError("Due date cannot be after the risk's impact date", 400);
    }

    const action = await prisma.riskMitigationAction.update({
      where: { id: existing.id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        status: status ?? undefined,
        isComplete: isComplete !== undefined ? Boolean(isComplete) : undefined,
      },
    });

    res.json({ data: action });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/issues/:id/mitigation-actions/:actionId
issuesRouter.delete('/:id/mitigation-actions/:actionId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const issue = await prisma.risk.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, progress: true },
    });
    if (!issue) throw new AppError('Issue not found', 404);
    if (issue.progress !== 'escalated_to_issue') throw new AppError('This risk has not been escalated to an issue', 400);

    const existing = await prisma.riskMitigationAction.findFirst({
      where: { id: req.params.actionId as string, riskId: issue.id },
    });
    if (!existing) throw new AppError('Mitigation action not found', 404);

    await prisma.riskMitigationAction.delete({ where: { id: existing.id } });
    res.json({ data: { id: existing.id } });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
