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
      application: { select: { id: true, name: true } },
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

statusAdminRouter.get('/phases', async (_req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.statusPhase.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.json({ data });
});

// GET /api/status-admin/roadmap — all active projects with phases for cross-project Gantt
statusAdminRouter.get('/roadmap', async (_req: AuthenticatedRequest, res: Response) => {
  const projects = await prisma.statusProject.findMany({
    where: { isActive: true },
    include: {
      program: { select: { id: true, name: true } },
      application: { select: { id: true, name: true } },
      phases: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ program: { name: 'asc' } }, { name: 'asc' }],
  });
  res.json({ data: projects });
});

// GET /api/status-admin/rollup — executive rollup with time-windowed data
statusAdminRouter.get('/rollup', async (req: AuthenticatedRequest, res: Response) => {
  const { window: win, programId, startDate, endDate } = req.query as Record<string, string>;

  const now = new Date();
  let windowStart: Date;
  let windowEnd: Date = now;

  if (startDate && endDate) {
    windowStart = new Date(startDate);
    windowEnd = new Date(endDate);
    // set end to end of day
    windowEnd.setHours(23, 59, 59, 999);
  } else {
    switch (win) {
      case 'biweek':
        windowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case 'month': {
        windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'week':
      default: {
        // Start of current week (Monday)
        const day = now.getDay(); // 0=Sun
        const diff = (day === 0 ? -6 : 1 - day);
        windowStart = new Date(now);
        windowStart.setDate(now.getDate() + diff);
        windowStart.setHours(0, 0, 0, 0);
        break;
      }
    }
  }

  const dateFilter = { gte: windowStart, lte: windowEnd };

  const projects = await prisma.statusProject.findMany({
    where: {
      isActive: true,
      ...(programId ? { programId } : {}),
    },
    include: {
      program: { select: { id: true, name: true } },
      application: { select: { id: true, name: true } },
      updates: {
        where: { createdAt: dateFilter },
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, displayName: true } } },
      },
      accomplishments: {
        where: { createdAt: dateFilter },
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, displayName: true } } },
      },
      issues: {
        where: {
          OR: [
            { createdAt: dateFilter },
            { resolvedAt: dateFilter },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, displayName: true } },
          resolvedBy: { select: { id: true, displayName: true } },
        },
      },
      staffingProject: {
        include: {
          assignments: {
            where: { isActive: true },
            include: {
              resource: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  resourceType: true,
                  popEndDate: true,
                  assignments: {
                    where: { isActive: true },
                    select: { percentUtilized: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ program: { name: 'asc' } }, { name: 'asc' }],
  });

  // Fetch the most recent update BEFORE the window for each project to determine trend
  const projectIds = projects.map((p) => p.id);
  const previousUpdates = projectIds.length > 0
    ? await prisma.statusUpdate.findMany({
        where: {
          statusProjectId: { in: projectIds },
          createdAt: { lt: windowStart },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['statusProjectId'],
        select: { statusProjectId: true, overallStatus: true },
      })
    : [];
  const previousStatusMap = new Map(previousUpdates.map((u) => [u.statusProjectId, u.overallStatus]));

  // --- Staffing risk helpers ---
  const POP_HORIZON_DAYS = 60;
  const popHorizon = new Date(now.getTime() + POP_HORIZON_DAYS * 24 * 60 * 60 * 1000);

  type StaffingRisk = {
    fteCount: number;
    contractorCount: number;
    overAllocated: { id: string; name: string; totalPercent: number }[];
    popExpiring: { id: string; name: string; popEndDate: string; daysRemaining: number }[];
  };

  function computeStaffing(sp: (typeof projects)[number]['staffingProject']): StaffingRisk | null {
    if (!sp) return null;
    const assignments = sp.assignments;

    const fteCount        = assignments.filter((a) => a.resource.resourceType === 'federal').length;
    const contractorCount = assignments.filter((a) => a.resource.resourceType === 'contractor').length;

    const overAllocated = assignments
      .map((a) => ({
        id:           a.resource.id,
        name:         `${a.resource.firstName} ${a.resource.lastName}`,
        totalPercent: a.resource.assignments.reduce((s, x) => s + x.percentUtilized, 0),
      }))
      .filter((r) => r.totalPercent > 1.0);

    const popExpiring = assignments
      .filter((a) => {
        const pop = a.resource.popEndDate;
        return (
          a.resource.resourceType === 'contractor' &&
          pop != null &&
          new Date(pop) >= now &&
          new Date(pop) <= popHorizon
        );
      })
      .map((a) => ({
        id:           a.resource.id,
        name:         `${a.resource.firstName} ${a.resource.lastName}`,
        popEndDate:   a.resource.popEndDate!.toISOString(),
        daysRemaining: Math.ceil(
          (new Date(a.resource.popEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { fteCount, contractorCount, overAllocated, popExpiring };
  }

  // Pre-compute staffing per project to reuse for both the response map and summary counts
  const staffingMap = new Map<string, StaffingRisk | null>(
    projects.map((p) => [p.id, computeStaffing(p.staffingProject)])
  );

  // Group by program
  const programMap = new Map<string, { id: string; name: string; projects: typeof projects }>();
  for (const p of projects) {
    if (!programMap.has(p.programId)) {
      programMap.set(p.programId, { id: p.programId, name: p.program.name, projects: [] });
    }
    programMap.get(p.programId)!.projects.push(p);
  }

  const programs = Array.from(programMap.values()).map((prog) => ({
    ...prog,
    projects: prog.projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      previousStatus: previousStatusMap.get(p.id) ?? null,
      nextUpdateDue: p.nextUpdateDue?.toISOString() ?? null,
      federalProductOwner: p.federalProductOwner,
      customerContact: p.customerContact,
      application: p.application,
      updates: p.updates,
      accomplishments: p.accomplishments,
      issues: p.issues.filter((i) => i.category === 'issue' && !i.resolvedAt),
      risks: p.issues.filter((i) => i.category === 'risk' && !i.resolvedAt),
      blockers: p.issues.filter((i) => i.category === 'blocker' && !i.resolvedAt),
      resolvedIssues: p.issues.filter((i) => !!i.resolvedAt),
      staffing: staffingMap.get(p.id) ?? null,
    })),
  }));

  // Summary counts across all projects in window
  const allProjects = projects;
  const summary = {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    totalProjects: allProjects.length,
    greenCount: allProjects.filter((p) => p.status === 'green').length,
    yellowCount: allProjects.filter((p) => p.status === 'yellow').length,
    redCount: allProjects.filter((p) => p.status === 'red').length,
    grayCount: allProjects.filter((p) => p.status === 'gray').length,
    newAccomplishments: allProjects.reduce((n, p) => n + p.accomplishments.length, 0),
    newUpdates: allProjects.reduce((n, p) => n + p.updates.length, 0),
    openIssues: allProjects.reduce((n, p) => n + p.issues.filter((i) => i.category === 'issue' && !i.resolvedAt).length, 0),
    openRisks: allProjects.reduce((n, p) => n + p.issues.filter((i) => i.category === 'risk' && !i.resolvedAt).length, 0),
    openBlockers: allProjects.reduce((n, p) => n + p.issues.filter((i) => i.category === 'blocker' && !i.resolvedAt).length, 0),
    resolvedCount: allProjects.reduce((n, p) => n + p.issues.filter((i) => !!i.resolvedAt).length, 0),
    staffingOverAllocatedProjects: allProjects.filter((p) => (staffingMap.get(p.id)?.overAllocated.length ?? 0) > 0).length,
    staffingPopExpiringProjects:   allProjects.filter((p) => (staffingMap.get(p.id)?.popExpiring.length   ?? 0) > 0).length,
  };

  res.json({ data: { summary, programs } });
});

// GET /api/status-admin/reports — per-program/project summary for the reports page
statusAdminRouter.get('/reports', async (_req: AuthenticatedRequest, res: Response) => {
  const projects = await prisma.statusProject.findMany({
    where: { isActive: true },
    include: {
      program: { select: { id: true, name: true } },
      priority: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      application: { select: { id: true, name: true } },
      _count: { select: { updates: true, issues: true } },
    },
    orderBy: [{ program: { name: 'asc' } }, { name: 'asc' }],
  });
  res.json({ data: projects });
});

// GET /api/status-admin/trends — per-project RAG status history for sparklines
statusAdminRouter.get('/trends', async (_req: AuthenticatedRequest, res: Response) => {
  const updates = await prisma.statusUpdate.findMany({
    where: {
      statusProject: { isActive: true },
    },
    select: {
      statusProjectId: true,
      overallStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const trends: Record<string, Array<{ status: string; date: string }>> = {};
  for (const u of updates) {
    if (!trends[u.statusProjectId]) trends[u.statusProjectId] = [];
    trends[u.statusProjectId].push({
      status: u.overallStatus,
      date: u.createdAt.toISOString(),
    });
  }

  res.json({ data: trends });
});

// POST /api/status-admin/ai-summary — placeholder for AI-generated exec summary
statusAdminRouter.post('/ai-summary', async (req: AuthenticatedRequest, res: Response) => {
  const { window: win, programId, startDate, endDate } = req.body as Record<string, string>;

  // TODO: Integrate with Claude API or other AI service
  // For now, return a placeholder response
  const summary = `
# Executive Summary

**Window:** ${startDate && endDate ? `${startDate} to ${endDate}` : win || 'This Week'}
${programId ? `**Program:** [Selected]` : ''}

## Key Highlights
- Portfolio status: Primarily on track with 3 areas at risk
- Staffing: 2 contractors approaching end of period
- Critical blockers identified in Infrastructure modernization

## Recommendations
- Schedule risk mitigation meeting for At Risk projects
- Begin contractor replacement planning
- Escalate blocker resolution in timeline

*This is a placeholder summary. Full AI integration coming soon.*
  `.trim();

  res.json({ data: { summary } });
});
