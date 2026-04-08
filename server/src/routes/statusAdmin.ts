import { Router, Response } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

export const statusAdminRouter = Router();
statusAdminRouter.use(requireAuth);

// GET /api/status-admin/dashboard-stats
statusAdminRouter.get('/dashboard-stats', async (_req: AuthenticatedRequest, res: Response) => {
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const projects = await prisma.statusProject.findMany({
    where: { isActive: true },
    include: {
      program: { select: { id: true, name: true } },
      phases: { where: { endDate: { gte: now, lte: twoWeeksFromNow } }, orderBy: { endDate: 'asc' } },
    },
  });

  const totalProjects = projects.length;
  const greenCount = projects.filter((p) => p.status === 'green').length;
  const yellowCount = projects.filter((p) => p.status === 'yellow').length;
  const redCount = projects.filter((p) => p.status === 'red').length;
  const grayCount = projects.filter((p) => p.status === 'gray').length;
  const overdueUpdates = projects.filter((p) => p.nextUpdateDue && p.nextUpdateDue < now).length;

  // Program summaries
  const programMap = new Map<string, { id: string; name: string; projects: typeof projects }>();
  for (const p of projects) {
    const key = p.programId;
    if (!programMap.has(key)) {
      programMap.set(key, { id: key, name: p.program.name, projects: [] });
    }
    programMap.get(key)!.projects.push(p);
  }

  const statusOrder = { red: 0, yellow: 1, green: 2, gray: 3 } as const;
  const programSummaries = Array.from(programMap.values()).map((prog) => {
    const worst = prog.projects.reduce((w, p) => {
      return statusOrder[p.status as keyof typeof statusOrder] < statusOrder[w as keyof typeof statusOrder] ? p.status : w;
    }, 'gray' as string);

    // Get most recent update date from any project in the program
    const latestProject = prog.projects.reduce<Date | null>((latest, p) => {
      return p.updatedAt > (latest || new Date(0)) ? p.updatedAt : latest;
    }, null);

    return {
      id: prog.id,
      name: prog.name,
      projectCount: prog.projects.length,
      worstStatus: worst,
      lastUpdateDate: latestProject?.toISOString() || null,
    };
  });

  // Upcoming milestones
  const upcomingMilestones = projects.flatMap((p) =>
    p.phases.map((ph) => ({
      projectId: p.id,
      projectName: p.name,
      phaseName: ph.name,
      endDate: ph.endDate.toISOString(),
    }))
  ).sort((a, b) => a.endDate.localeCompare(b.endDate));

  res.json({
    data: {
      totalProjects,
      greenCount,
      yellowCount,
      redCount,
      grayCount,
      overdueUpdates,
      programSummaries,
      upcomingMilestones,
    },
  });
});

// ─── Reference data endpoints ────────────────────────────────────────────────

statusAdminRouter.get('/departments', async (_req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ data });
});

statusAdminRouter.get('/priorities', async (_req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.statusPriority.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.json({ data });
});

statusAdminRouter.get('/execution-types', async (_req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.executionType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ data });
});

statusAdminRouter.get('/customer-categories', async (_req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.customerCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ data });
});

statusAdminRouter.get('/rag-definitions', async (_req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.ragDefinition.findMany({ where: { isActive: true } });
  res.json({ data });
});

// GET /api/status-admin/roadmap — all active projects with phases for cross-project Gantt
statusAdminRouter.get('/roadmap', async (_req: AuthenticatedRequest, res: Response) => {
  const projects = await prisma.statusProject.findMany({
    where: { isActive: true },
    include: {
      program: { select: { id: true, name: true } },
      phases: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ program: { name: 'asc' } }, { name: 'asc' }],
  });
  res.json({ data: projects });
});

// GET /api/status-admin/reports — per-program/project summary for the reports page
statusAdminRouter.get('/reports', async (_req: AuthenticatedRequest, res: Response) => {
  const projects = await prisma.statusProject.findMany({
    where: { isActive: true },
    include: {
      program: { select: { id: true, name: true } },
      owner: { select: { id: true, displayName: true } },
      priority: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      _count: { select: { updates: true, issues: true } },
    },
    orderBy: [{ program: { name: 'asc' } }, { name: 'asc' }],
  });
  res.json({ data: projects });
});
