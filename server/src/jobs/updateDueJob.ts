import { prisma } from '../services/prisma';
import { notifyUser } from '../services/notificationService';

const DEDUP_WINDOW_DAYS = 3; // don't re-fire within 3 days for the same project+type

async function runUpdateDueCheck(): Promise<void> {
  console.log('[updateDueJob] Running update-due check...');

  const now = new Date();

  const dedupCutoff = new Date(now);
  dedupCutoff.setDate(dedupCutoff.getDate() - DEDUP_WINDOW_DAYS);

  // Projects with update due within the next 3 days (but not yet overdue)
  const soonCutoff = new Date(now);
  soonCutoff.setDate(soonCutoff.getDate() + 3);

  const [dueSoon, overdue] = await Promise.all([
    prisma.statusProject.findMany({
      where: {
        isActive: true,
        nextUpdateDue: { gte: now, lte: soonCutoff },
      },
      select: { id: true, name: true, nextUpdateDue: true },
    }),
    prisma.statusProject.findMany({
      where: {
        isActive: true,
        nextUpdateDue: { lt: now },
      },
      select: { id: true, name: true, nextUpdateDue: true },
    }),
  ]);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const project of dueSoon) {
    // Dedup: skip if we already sent update_due for this project recently
    const recent = await prisma.notification.findFirst({
      where: {
        type: 'update_due',
        statusProjectId: project.id,
        createdAt: { gte: dedupCutoff },
      },
    });
    if (recent) continue;

    const daysUntil = Math.ceil((project.nextUpdateDue!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const title = `Update due soon: ${project.name}`;
    const message = `A status update for "${project.name}" is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`;

    console.log(`[updateDueJob] update_due — ${project.name} (in ${daysUntil}d)`);
    await Promise.all(
      users.map((u) =>
        notifyUser(u.id, 'update_due', title, message, {
          linkUrl: `/status/projects/${project.id}`,
          statusProjectId: project.id,
        }),
      ),
    );
  }

  for (const project of overdue) {
    // Dedup: skip if we already sent update_overdue for this project recently
    const recent = await prisma.notification.findFirst({
      where: {
        type: 'update_overdue',
        statusProjectId: project.id,
        createdAt: { gte: dedupCutoff },
      },
    });
    if (recent) continue;

    const daysOverdue = Math.floor((now.getTime() - project.nextUpdateDue!.getTime()) / (1000 * 60 * 60 * 24));
    const title = `Update overdue: ${project.name}`;
    const message = `A status update for "${project.name}" is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.`;

    console.log(`[updateDueJob] update_overdue — ${project.name} (${daysOverdue}d overdue)`);
    await Promise.all(
      users.map((u) =>
        notifyUser(u.id, 'update_overdue', title, message, {
          linkUrl: `/status/projects/${project.id}`,
          statusProjectId: project.id,
        }),
      ),
    );
  }

  console.log('[updateDueJob] Done.');
}

export function startUpdateDueJob(): void {
  // Run once at startup, then every 24 hours
  runUpdateDueCheck().catch(console.error);
  setInterval(() => runUpdateDueCheck().catch(console.error), 24 * 60 * 60 * 1000);
  console.log('[updateDueJob] Scheduled — runs daily.');
}
