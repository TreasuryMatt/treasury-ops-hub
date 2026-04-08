import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'documents');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const statusProjectsRouter = Router();
statusProjectsRouter.use(requireAuth);

const PROJECT_INCLUDE = {
  program: { select: { id: true, name: true } },
  owner: { select: { id: true, displayName: true } },
  department: { select: { id: true, name: true } },
  priority: { select: { id: true, name: true, sortOrder: true } },
  executionType: { select: { id: true, name: true } },
  customerCategory: { select: { id: true, name: true } },
  products: { include: { product: { select: { id: true, name: true } } } },
};

// GET /api/status-projects
statusProjectsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { programId, status, search } = req.query as Record<string, string>;

  const where: any = { isActive: true };
  if (programId) where.programId = programId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const projects = await prisma.statusProject.findMany({
    where,
    include: PROJECT_INCLUDE,
    orderBy: { name: 'asc' },
  });

  res.json({ data: projects });
});

// GET /api/status-projects/:id
statusProjectsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const project = await prisma.statusProject.findUnique({
    where: { id: req.params.id as string as string },
    include: PROJECT_INCLUDE,
  });

  if (!project) return next(new AppError('Project not found', 404));
  res.json({ data: project });
});

// POST /api/status-projects
statusProjectsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const project = await prisma.statusProject.create({
      data: {
        name: b.name,
        description: b.description || null,
        programId: b.programId,
        ownerId: req.user!.id,
        departmentId: b.departmentId || null,
        priorityId: b.priorityId || null,
        executionTypeId: b.executionTypeId || null,
        customerCategoryId: b.customerCategoryId || null,
        phase: b.phase || null,
        status: b.status || 'gray',
        plannedStartDate: b.plannedStartDate ? new Date(b.plannedStartDate) : null,
        plannedEndDate: b.plannedEndDate ? new Date(b.plannedEndDate) : null,
        actualStartDate: b.actualStartDate ? new Date(b.actualStartDate) : null,
        actualEndDate: b.actualEndDate ? new Date(b.actualEndDate) : null,
        funded: b.funded || false,
        updateCadence: b.updateCadence || 'monthly',
        nextUpdateDue: b.plannedStartDate ? computeNextUpdateDue(new Date(b.plannedStartDate), b.updateCadence || 'monthly') : null,
        products: b.productIds?.length
          ? { create: b.productIds.map((pid: string) => ({ productId: pid })) }
          : undefined,
      },
      include: PROJECT_INCLUDE,
    });

    await logAction(req.user!.id, 'create', 'status_project', project.id, {}, req.ip);
    res.status(201).json({ data: project });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/status-projects/:id
statusProjectsRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;

    // Handle product links: delete existing, re-create
    if (b.productIds) {
      await prisma.statusProjectProduct.deleteMany({ where: { statusProjectId: req.params.id as string } });
    }

    const project = await prisma.statusProject.update({
      where: { id: req.params.id as string },
      data: {
        name: b.name,
        description: b.description ?? undefined,
        programId: b.programId ?? undefined,
        departmentId: b.departmentId,
        priorityId: b.priorityId,
        executionTypeId: b.executionTypeId,
        customerCategoryId: b.customerCategoryId,
        phase: b.phase ?? undefined,
        status: b.status ?? undefined,
        plannedStartDate: b.plannedStartDate !== undefined ? (b.plannedStartDate ? new Date(b.plannedStartDate) : null) : undefined,
        plannedEndDate: b.plannedEndDate !== undefined ? (b.plannedEndDate ? new Date(b.plannedEndDate) : null) : undefined,
        actualStartDate: b.actualStartDate !== undefined ? (b.actualStartDate ? new Date(b.actualStartDate) : null) : undefined,
        actualEndDate: b.actualEndDate !== undefined ? (b.actualEndDate ? new Date(b.actualEndDate) : null) : undefined,
        funded: b.funded ?? undefined,
        updateCadence: b.updateCadence ?? undefined,
        products: b.productIds
          ? { create: b.productIds.map((pid: string) => ({ productId: pid })) }
          : undefined,
      },
      include: PROJECT_INCLUDE,
    });

    await logAction(req.user!.id, 'update', 'status_project', project.id, {}, req.ip);
    res.json({ data: project });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Status Updates ──────────────────────────────────────────────────────────

// GET /api/status-projects/:id/updates
statusProjectsRouter.get('/:id/updates', async (req: AuthenticatedRequest, res: Response) => {
  const updates = await prisma.statusUpdate.findMany({
    where: { statusProjectId: req.params.id as string },
    include: { author: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: updates });
});

// POST /api/status-projects/:id/updates
statusProjectsRouter.post('/:id/updates', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const update = await prisma.statusUpdate.create({
      data: {
        statusProjectId: req.params.id as string,
        authorId: req.user!.id,
        overallStatus: b.overallStatus,
        summary: b.summary,
        risks: b.risks || null,
        blockers: b.blockers || null,
      },
      include: { author: { select: { id: true, displayName: true } } },
    });

    // Update project's status to match latest update and compute next update due
    const project = await prisma.statusProject.findUnique({ where: { id: req.params.id as string } });
    if (project) {
      await prisma.statusProject.update({
        where: { id: req.params.id as string },
        data: {
          status: b.overallStatus,
          nextUpdateDue: computeNextUpdateDue(new Date(), project.updateCadence),
        },
      });
    }

    await logAction(req.user!.id, 'create', 'status_update', update.id, { statusProjectId: req.params.id as string }, req.ip);
    res.status(201).json({ data: update });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Phases ──────────────────────────────────────────────────────────────────

// GET /api/status-projects/:id/phases
statusProjectsRouter.get('/:id/phases', async (req: AuthenticatedRequest, res: Response) => {
  const phases = await prisma.projectPhase.findMany({
    where: { statusProjectId: req.params.id as string },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ data: phases });
});

// POST /api/status-projects/:id/phases
statusProjectsRouter.post('/:id/phases', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const maxOrder = await prisma.projectPhase.aggregate({
      where: { statusProjectId: req.params.id as string },
      _max: { sortOrder: true },
    });

    const phase = await prisma.projectPhase.create({
      data: {
        statusProjectId: req.params.id as string,
        name: b.name,
        startDate: new Date(b.startDate),
        endDate: new Date(b.endDate),
        color: b.color || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.status(201).json({ data: phase });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/status-projects/:id/phases/:phaseId
statusProjectsRouter.put('/:id/phases/:phaseId', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const phase = await prisma.projectPhase.update({
      where: { id: req.params.phaseId as string },
      data: {
        name: b.name ?? undefined,
        startDate: b.startDate ? new Date(b.startDate) : undefined,
        endDate: b.endDate ? new Date(b.endDate) : undefined,
        color: b.color ?? undefined,
        sortOrder: b.sortOrder ?? undefined,
      },
    });
    res.json({ data: phase });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Issues ──────────────────────────────────────────────────────────────────

// GET /api/status-projects/:id/issues
statusProjectsRouter.get('/:id/issues', async (req: AuthenticatedRequest, res: Response) => {
  const issues = await prisma.issueEntry.findMany({
    where: { statusProjectId: req.params.id as string },
    include: { author: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: issues });
});

// POST /api/status-projects/:id/issues
statusProjectsRouter.post('/:id/issues', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const issue = await prisma.issueEntry.create({
      data: {
        statusProjectId: req.params.id as string,
        authorId: req.user!.id,
        category: b.category,
        text: b.text,
      },
      include: { author: { select: { id: true, displayName: true } } },
    });
    res.status(201).json({ data: issue });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Accomplishments ─────────────────────────────────────────────────────────

// GET /api/status-projects/:id/accomplishments
statusProjectsRouter.get('/:id/accomplishments', async (req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.accomplishment.findMany({
    where: { statusProjectId: req.params.id as string },
    include: { author: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: items });
});

// POST /api/status-projects/:id/accomplishments
statusProjectsRouter.post('/:id/accomplishments', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.accomplishment.create({
      data: {
        statusProjectId: req.params.id as string,
        authorId: req.user!.id,
        text: req.body.text,
      },
      include: { author: { select: { id: true, displayName: true } } },
    });
    res.status(201).json({ data: item });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/status-projects/:id/accomplishments/:aId
statusProjectsRouter.delete('/:id/accomplishments/:aId', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.accomplishment.delete({ where: { id: req.params.aId as string } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Documents ───────────────────────────────────────────────────────────────

// GET /api/status-projects/:id/documents
statusProjectsRouter.get('/:id/documents', async (req: AuthenticatedRequest, res: Response) => {
  const docs = await prisma.document.findMany({
    where: { statusProjectId: req.params.id as string },
    include: { uploadedBy: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: docs });
});

// POST /api/status-projects/:id/documents
statusProjectsRouter.post('/:id/documents', requireEditor, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const doc = await prisma.document.create({
      data: {
        statusProjectId: req.params.id as string,
        uploadedById: req.user!.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
      include: { uploadedBy: { select: { id: true, displayName: true } } },
    });
    res.status(201).json({ data: doc });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// GET /api/status-projects/:id/documents/:docId/download
statusProjectsRouter.get('/:id/documents/:docId/download', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.docId as string } });
  if (!doc) return next(new AppError('Document not found', 404));

  const filePath = path.join(process.cwd(), 'uploads', 'documents', doc.filename);
  if (!fs.existsSync(filePath)) return next(new AppError('File not found on disk', 404));

  res.download(filePath, doc.originalName);
});

// DELETE /api/status-projects/:id/documents/:docId
statusProjectsRouter.delete('/:id/documents/:docId', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.docId as string } });
    if (!doc) return next(new AppError('Document not found', 404));

    await prisma.document.delete({ where: { id: req.params.docId as string } });

    // Try to remove file from disk
    const filePath = path.join(process.cwd(), 'uploads', 'documents', doc.filename);
    try { fs.unlinkSync(filePath); } catch {}

    res.json({ message: 'Document deleted' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Staffing cross-reference ────────────────────────────────────────────────

// GET /api/status-projects/:id/staffing
statusProjectsRouter.get('/:id/staffing', async (req: AuthenticatedRequest, res: Response) => {
  const sp = await prisma.statusProject.findUnique({
    where: { id: req.params.id as string },
    include: { products: { select: { productId: true } } },
  });

  if (!sp) return res.json({ data: [], linkedProjectId: null });

  // Find the best-matching staffing project by name
  const linkedProject = await prisma.project.findFirst({
    where: { name: { equals: sp.name, mode: 'insensitive' }, isActive: true },
    select: { id: true },
  });

  const linkedProjectId = linkedProject?.id ?? null;

  if (!linkedProjectId) {
    return res.json({ data: [], linkedProjectId: null });
  }

  const assignments = await prisma.assignment.findMany({
    where: { projectId: linkedProjectId, isActive: true },
    include: {
      resource: { select: { id: true, firstName: true, lastName: true, resourceType: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: [{ resource: { lastName: 'asc' } }],
  });

  res.json({ data: assignments, linkedProjectId });
});

// POST /api/status-projects/:id/staffing/ensure-project
// Finds or creates a linked staffing Project so assignments can be added
statusProjectsRouter.post('/:id/staffing/ensure-project', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sp = await prisma.statusProject.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, name: true },
    });
    if (!sp) return next(new AppError('Status project not found', 404));

    // Find or create a staffing project with the same name
    let project = await prisma.project.findFirst({
      where: { name: { equals: sp.name, mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });

    if (!project) {
      project = await prisma.project.create({
        data: { name: sp.name, status: 'in_progress' },
        select: { id: true },
      });
    }

    res.json({ linkedProjectId: project.id });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function computeNextUpdateDue(from: Date, cadence: string): Date {
  const d = new Date(from);
  switch (cadence) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}
