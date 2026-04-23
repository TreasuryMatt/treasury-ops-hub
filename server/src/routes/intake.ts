import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../services/prisma';
import { requireAuth, requireIntakeReviewer } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const intakeRouter = Router();
intakeRouter.use(requireAuth);

// ─── File upload config ─────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'intake');
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
];

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const submissionId = (req.params.id as string) || 'temp';
    const dir = path.join(UPLOAD_DIR, submissionId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400) as any);
    }
  },
});

// ─── Shared includes ────────────────────────────────────────────────────────
const SUBMISSION_INCLUDE = {
  submitter: { select: { id: true, displayName: true, email: true } },
  determinedBy: { select: { id: true, displayName: true } },
  linkedProject: { select: { id: true, name: true, status: true } },
  currentVersion: {
    include: { createdBy: { select: { id: true, displayName: true } } },
  },
  documents: {
    include: { uploadedBy: { select: { id: true, displayName: true } } },
    orderBy: { uploadedAt: 'desc' as const },
  },
};

const SUBMISSION_LIST_INCLUDE = {
  submitter: { select: { id: true, displayName: true, email: true } },
  determinedBy: { select: { id: true, displayName: true } },
  linkedProject: { select: { id: true, name: true, status: true } },
  _count: { select: { versions: true, documents: true } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function isSubmitterOrReviewer(req: AuthenticatedRequest, submitterId: string): boolean {
  if (!req.user) return false;
  return req.user.id === submitterId || req.user.isIntakeReviewer || req.user.role === 'admin';
}

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOMER ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// ─── Create draft submission ────────────────────────────────────────────────
intakeRouter.post('/submissions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, formData } = req.body as { title: string; formData?: Record<string, any> };
    if (!title) {
      next(new AppError('Title is required', 400));
      return;
    }

    const submission = await prisma.$transaction(async (tx) => {
      // Create the submission
      const sub = await tx.intakeSubmission.create({
        data: {
          title,
          submitterId: req.user!.id,
          status: 'draft',
        },
      });

      // Create initial version
      const version = await tx.intakeSubmissionVersion.create({
        data: {
          submissionId: sub.id,
          versionNumber: 1,
          formData: formData || {},
          createdById: req.user!.id,
        },
      });

      // Link current version
      return tx.intakeSubmission.update({
        where: { id: sub.id },
        data: { currentVersionId: version.id },
        include: SUBMISSION_INCLUDE,
      });
    });

    await logAction(req.user!.id, 'create', 'intake_submission', submission.id, { title }, req.ip);
    res.status(201).json({ data: submission });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── List own submissions (customer) ────────────────────────────────────────
intakeRouter.get('/submissions/mine', async (req: AuthenticatedRequest, res: Response) => {
  const submissions = await prisma.intakeSubmission.findMany({
    where: { submitterId: req.user!.id },
    include: SUBMISSION_LIST_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ data: submissions });
});

// ─── Get single submission ──────────────────────────────────────────────────
intakeRouter.get('/submissions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.id as string;
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: submissionId },
      include: SUBMISSION_INCLUDE,
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (!isSubmitterOrReviewer(req, submission.submitterId)) {
      next(new AppError('Forbidden', 403));
      return;
    }

    // Strip AI score for non-reviewers
    const data = { ...submission } as any;
    if (req.user!.id === submission.submitterId && !req.user!.isIntakeReviewer && req.user!.role !== 'admin') {
      data.aiScore = null;
      data.aiScoreDetails = null;
      data.aiScoredAt = null;
    }

    res.json({ data });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Update submission (creates new version) ────────────────────────────────
intakeRouter.put('/submissions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, formData } = req.body as { title?: string; formData: Record<string, any> };
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (submission.submitterId !== req.user!.id) {
      next(new AppError('Only the submitter can edit', 403));
      return;
    }
    if (submission.status === 'approved' || submission.status === 'denied') {
      next(new AppError('Cannot edit a submission that has been determined', 400));
      return;
    }

    const nextVersionNum = (submission.versions[0]?.versionNumber ?? 0) + 1;

    const updated = await prisma.$transaction(async (tx) => {
      const version = await tx.intakeSubmissionVersion.create({
        data: {
          submissionId: submission.id,
          versionNumber: nextVersionNum,
          formData,
          createdById: req.user!.id,
        },
      });

      return tx.intakeSubmission.update({
        where: { id: submission.id },
        data: {
          currentVersionId: version.id,
          ...(title ? { title } : {}),
        },
        include: SUBMISSION_INCLUDE,
      });
    });

    await logAction(req.user!.id, 'update', 'intake_submission', submission.id, { versionNumber: nextVersionNum }, req.ip);
    res.json({ data: updated });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Submit (draft → submitted) ─────────────────────────────────────────────
intakeRouter.post('/submissions/:id/submit', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (submission.submitterId !== req.user!.id) {
      next(new AppError('Only the submitter can submit', 403));
      return;
    }
    if (submission.status !== 'draft') {
      next(new AppError('Only draft submissions can be submitted', 400));
      return;
    }

    const updated = await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: { status: 'submitted' },
      include: SUBMISSION_INCLUDE,
    });

    await logAction(req.user!.id, 'submit', 'intake_submission', submission.id, {}, req.ip);
    res.json({ data: updated });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Delete draft submission ────────────────────────────────────────────────
intakeRouter.delete('/submissions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      include: { documents: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (submission.submitterId !== req.user!.id) {
      next(new AppError('Only the submitter can delete this submission', 403));
      return;
    }
    if (submission.status !== 'draft') {
      next(new AppError('Only draft submissions can be deleted', 400));
      return;
    }

    // Remove uploaded files from disk
    for (const doc of submission.documents) {
      if (fs.existsSync(doc.storagePath)) fs.unlinkSync(doc.storagePath);
    }

    await prisma.intakeSubmission.delete({ where: { id: submission.id } });
    await logAction(req.user!.id, 'delete', 'intake_submission', submission.id, { title: submission.title }, req.ip);
    res.json({ message: 'Submission deleted' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── List version history ───────────────────────────────────────────────────
intakeRouter.get('/submissions/:id/versions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      select: { submitterId: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (!isSubmitterOrReviewer(req, submission.submitterId)) {
      next(new AppError('Forbidden', 403));
      return;
    }

    const versions = await prisma.intakeSubmissionVersion.findMany({
      where: { submissionId: req.params.id as string },
      include: { createdBy: { select: { id: true, displayName: true } } },
      orderBy: { versionNumber: 'desc' },
    });
    res.json({ data: versions });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Get specific version ───────────────────────────────────────────────────
intakeRouter.get('/submissions/:id/versions/:versionId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.id as string;
    const versionId = req.params.versionId as string;
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: submissionId },
      select: { submitterId: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (!isSubmitterOrReviewer(req, submission.submitterId)) {
      next(new AppError('Forbidden', 403));
      return;
    }

    const version = await prisma.intakeSubmissionVersion.findUnique({
      where: { id: versionId },
      include: { createdBy: { select: { id: true, displayName: true } } },
    });
    if (!version || version.submissionId !== submissionId) {
      next(new AppError('Version not found', 404));
      return;
    }
    res.json({ data: version });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Upload document ────────────────────────────────────────────────────────
intakeRouter.post('/submissions/:id/documents', upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      select: { submitterId: true, status: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (!isSubmitterOrReviewer(req, submission.submitterId)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    if (!req.file) {
      next(new AppError('No file uploaded', 400));
      return;
    }

    const doc = await prisma.intakeDocument.create({
      data: {
        submissionId: req.params.id as string,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        uploadedById: req.user!.id,
      },
      include: { uploadedBy: { select: { id: true, displayName: true } } },
    });

    await logAction(req.user!.id, 'upload_document', 'intake_document', doc.id, { submissionId: req.params.id as string, originalName: req.file.originalname }, req.ip);
    res.status(201).json({ data: doc });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Download document ──────────────────────────────────────────────────────
intakeRouter.get('/submissions/:id/documents/:docId/download', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.id as string;
    const documentId = req.params.docId as string;
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: submissionId },
      select: { submitterId: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (!isSubmitterOrReviewer(req, submission.submitterId)) {
      next(new AppError('Forbidden', 403));
      return;
    }

    const doc = await prisma.intakeDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.submissionId !== submissionId) {
      next(new AppError('Document not found', 404));
      return;
    }

    if (!fs.existsSync(doc.storagePath)) {
      next(new AppError('File not found on disk', 404));
      return;
    }

    res.download(doc.storagePath, doc.originalName);
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Delete document ────────────────────────────────────────────────────────
intakeRouter.delete('/submissions/:id/documents/:docId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.id as string;
    const documentId = req.params.docId as string;
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: submissionId },
      select: { submitterId: true, status: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (submission.submitterId !== req.user!.id && !req.user!.isIntakeReviewer && req.user!.role !== 'admin') {
      next(new AppError('Forbidden', 403));
      return;
    }

    const doc = await prisma.intakeDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.submissionId !== submissionId) {
      next(new AppError('Document not found', 404));
      return;
    }

    // Delete file from disk
    if (fs.existsSync(doc.storagePath)) {
      fs.unlinkSync(doc.storagePath);
    }

    await prisma.intakeDocument.delete({ where: { id: doc.id } });
    await logAction(req.user!.id, 'delete_document', 'intake_document', doc.id, { submissionId }, req.ip);
    res.json({ message: 'Document deleted' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// REVIEWER ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// ─── List all submissions (reviewer) ────────────────────────────────────────
intakeRouter.get('/submissions', requireIntakeReviewer, async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '25', status, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, parseInt(limit) || 25);

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { submitter: { displayName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [submissions, total] = await Promise.all([
    prisma.intakeSubmission.findMany({
      where,
      include: SUBMISSION_LIST_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.intakeSubmission.count({ where }),
  ]);

  res.json({
    data: submissions,
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─── Dashboard stats (reviewer) ─────────────────────────────────────────────
intakeRouter.get('/dashboard/stats', requireIntakeReviewer, async (_req: AuthenticatedRequest, res: Response) => {
  const [total, drafts, submitted, underReview, backlogged, denied, approved, scoredSubmissions] = await Promise.all([
    prisma.intakeSubmission.count(),
    prisma.intakeSubmission.count({ where: { status: 'draft' } }),
    prisma.intakeSubmission.count({ where: { status: 'submitted' } }),
    prisma.intakeSubmission.count({ where: { status: 'under_review' } }),
    prisma.intakeSubmission.count({ where: { status: 'backlog' } }),
    prisma.intakeSubmission.count({ where: { status: 'denied' } }),
    prisma.intakeSubmission.count({ where: { status: 'approved' } }),
    prisma.intakeSubmission.aggregate({ _avg: { aiScore: true }, where: { aiScore: { not: null } } }),
  ]);

  const recentSubmissions = await prisma.intakeSubmission.findMany({
    where: { status: { in: ['submitted', 'under_review'] } },
    include: SUBMISSION_LIST_INCLUDE,
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  res.json({
    data: {
      total,
      byStatus: { draft: drafts, submitted, under_review: underReview, backlog: backlogged, denied, approved },
      avgScore: scoredSubmissions._avg.aiScore,
      recentSubmissions,
    },
  });
});

// ─── Trigger AI score ───────────────────────────────────────────────────────
intakeRouter.post('/submissions/:id/score', requireIntakeReviewer, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      include: {
        currentVersion: true,
        documents: { select: { filename: true, mimeType: true, sizeBytes: true } },
      },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }

    // TODO: Call real AI scorer when API is available
    // For now, return stub response
    const scoreResult = {
      score: 0,
      breakdown: [] as any[],
      note: 'AI scoring is not yet configured.',
    };

    const updated = await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: {
        aiScore: scoreResult.score,
        aiScoreDetails: scoreResult as any,
        aiScoredAt: new Date(),
        // Auto-move from submitted → under_review when first scored
        ...(submission.status === 'submitted' ? { status: 'under_review' } : {}),
      },
      include: SUBMISSION_INCLUDE,
    });

    await logAction(req.user!.id, 'score', 'intake_submission', submission.id, { score: scoreResult.score }, req.ip);
    res.json({ data: updated });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Set determination ──────────────────────────────────────────────────────
intakeRouter.put('/submissions/:id/determination', requireIntakeReviewer, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { determination, notes, denialReason, programId } = req.body as {
      determination: 'backlog' | 'denied' | 'approved';
      notes?: string;
      denialReason?: string;
      programId?: string;
    };

    if (!determination || !['backlog', 'denied', 'approved'].includes(determination)) {
      next(new AppError('Invalid determination', 400));
      return;
    }
    if (determination === 'denied' && !denialReason) {
      next(new AppError('Denial reason is required', 400));
      return;
    }

    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      include: { currentVersion: true },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (submission.status === 'draft') {
      next(new AppError('Draft submissions must be submitted before a determination can be recorded', 400));
      return;
    }

    // Map determination to IntakeStatus
    const statusMap: Record<string, string> = {
      backlog: 'backlog',
      denied: 'denied',
      approved: 'approved',
    };

    const previousDetermination = submission.determination;
    const previousStatus = submission.status;
    let linkedProjectId: string | null = submission.linkedProjectId;

    // Auto-create project on first approval only. If a linked project already exists,
    // preserve the relationship when the determination changes later.
    if (determination === 'approved' && !linkedProjectId) {
      // Need a program for the StatusProject — use provided or find a default
      let targetProgramId = programId;
      if (!targetProgramId) {
        const defaultProgram = await prisma.program.findFirst({ orderBy: { name: 'asc' } });
        if (defaultProgram) targetProgramId = defaultProgram.id;
      }

      if (targetProgramId) {
        const formData = (submission.currentVersion?.formData as Record<string, any>) || {};
        const project = await prisma.statusProject.create({
          data: {
            name: submission.title,
            description: formData.problemStatement || formData.businessGoals || null,
            programId: targetProgramId,
            status: 'initiated',
          },
        });
        linkedProjectId = project.id;
        await logAction(req.user!.id, 'create', 'status_project', project.id, { source: 'intake_approval', submissionId: submission.id }, req.ip);
      }
    }

    const updated = await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: {
        status: statusMap[determination] as any,
        determination: determination as any,
        determinationNotes: notes || null,
        denialReason: determination === 'denied' ? denialReason : null,
        determinedById: req.user!.id,
        determinedAt: new Date(),
        ...(linkedProjectId ? { linkedProjectId } : {}),
      },
      include: SUBMISSION_INCLUDE,
    });

    await logAction(
      req.user!.id,
      'determine',
      'intake_submission',
      submission.id,
      {
        previousDetermination,
        previousStatus,
        determination,
        nextStatus: statusMap[determination],
        linkedProjectId,
      },
      req.ip
    );
    res.json({ data: updated });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Generate design review doc ─────────────────────────────────────────────
intakeRouter.post('/submissions/:id/design-review', requireIntakeReviewer, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.id as string;
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        currentVersion: true,
        documents: { select: { filename: true, mimeType: true, sizeBytes: true } },
      },
    });
    if (!submission) {
      next(new AppError('Submission not found', 404));
      return;
    }
    if (submission.status !== 'approved') {
      next(new AppError('Design review can only be generated for approved submissions', 400));
      return;
    }

    const formData = (submission.currentVersion?.formData as Record<string, any>) || {};

    // Call AI stub to generate the markdown
    // TODO: Replace with real AI call when API is available
    const md = generateDesignReviewMarkdown(formData, submission.title);

    const updated = await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: {
        designReviewMd: md,
        designReviewGeneratedAt: new Date(),
      },
      include: SUBMISSION_INCLUDE,
    });

    await logAction(req.user!.id, 'generate_design_review', 'intake_submission', submission.id, {}, req.ip);
    res.json({ data: updated });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Download design review ─────────────────────────────────────────────────
intakeRouter.get('/submissions/:id/design-review/download', requireIntakeReviewer, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.intakeSubmission.findUnique({
      where: { id: req.params.id as string },
      select: { designReviewMd: true, title: true },
    });
    if (!submission || !submission.designReviewMd) {
      next(new AppError('Design review not found', 404));
      return;
    }

    const filename = `design-review-${submission.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(submission.designReviewMd);
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// ─── Design review markdown generator (stub, no AI) ─────────────────────────
function generateDesignReviewMarkdown(formData: Record<string, any>, title: string): string {
  const problemStatement = formData.problemStatement || '[TO BE DETERMINED]';
  const businessGoals = formData.businessGoals || '[TO BE DETERMINED]';
  const costSavings = formData.costSavings || '[TO BE DETERMINED]';
  const timeline = formData.desiredTimeline || '[TO BE DETERMINED]';
  const stakeholders = formData.stakeholders || '[TO BE DETERMINED]';
  const requirements = formData.technicalRequirements || '[TO BE DETERMINED]';
  const proposedSolution = formData.proposedSolution || '[TO BE DETERMINED]';
  const priority = formData.priority || '[TO BE DETERMINED]';

  return `# Design Review: ${title}

**Author:** [TO BE ASSIGNED]
**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** Draft
**Target Audience:** CTO / Technical Leadership

---

## Executive Summary

**What:** ${title}

**Why:** ${businessGoals}

**Expected Impact:** ${costSavings}

**Timeline:** ${timeline}

**Key Risks:** [TO BE DETERMINED — requires AI analysis]

---

## Background

### Current State
[TO BE DETERMINED — requires AI analysis of submitted materials]

### Problems
${problemStatement}

### Justification for Change
${costSavings}

---

## Goals

### Success Criteria
${businessGoals}

### Non-Goals
[TO BE DETERMINED]

### Measurable Outcomes
[TO BE DETERMINED]

---

## Solution Overview

### High-Level Approach
${proposedSolution}

### Architecture
[TO BE DETERMINED — requires AI analysis]

### Key Components
[TO BE DETERMINED — requires AI analysis]

---

## Detailed Design

### Component Descriptions
[TO BE DETERMINED — requires AI analysis]

### Technology Choices
[TO BE DETERMINED — requires AI analysis]

### Data Models / APIs
[TO BE DETERMINED — requires AI analysis]

---

## Implementation Plan

### Priority
${priority}

### Timeline & Milestones
${timeline}

### Team Assignments
[TO BE DETERMINED]

### Dependencies
[TO BE DETERMINED]

---

## Resource Requirements

### Stakeholders
${stakeholders}

### Team
[TO BE DETERMINED — "My prediction is that I need X engineers for Y weeks/months"]

---

## Technical Requirements

${requirements}

---

## Testing Strategy

[TO BE DETERMINED]

---

## Deployment Strategy

[TO BE DETERMINED]

---

## Operations

[TO BE DETERMINED]

---

## Risks

| Category | Risk | Severity | Mitigation | Owner |
|----------|------|----------|------------|-------|
| [TO BE DETERMINED] | | | | |

---

## Alternatives Considered

[TO BE DETERMINED — requires AI analysis]

---

## Critical Gaps

[TO BE DETERMINED]

---

## Open Questions

[TO BE DETERMINED]

---

## Approval

- [ ] Approval required before project execution
- Approvers: [TO BE DETERMINED]
- Next steps post-approval: [TO BE DETERMINED]
`;
}
