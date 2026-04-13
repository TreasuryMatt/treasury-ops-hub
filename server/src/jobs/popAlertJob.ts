import { prisma } from '../services/prisma';
import { notifyPopExpiring } from '../services/notificationService';

const DEFAULT_ALERT_DAYS = 30;
const DEDUP_WINDOW_DAYS = 7; // don't re-fire within 7 days

async function runPopAlertCheck(): Promise<void> {
  console.log('[popAlertJob] Running PoP expiry check...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dedupCutoff = new Date(today);
  dedupCutoff.setDate(dedupCutoff.getDate() - DEDUP_WINDOW_DAYS);

  // Fetch all active contractors with a popEndDate and a linked user account
  const contractors = await prisma.resource.findMany({
    where: {
      resourceType: 'contractor',
      isActive: true,
      popEndDate: { not: null },
      userId: { not: null }, // must have a linked user to notify
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      popEndDate: true,
      popAlertDaysBefore: true,
      user: { select: { id: true, email: true } },
    },
  });

  for (const contractor of contractors) {
    const popEnd = contractor.popEndDate!;
    const alertDays = contractor.popAlertDaysBefore ?? DEFAULT_ALERT_DAYS;

    const alertDate = new Date(popEnd);
    alertDate.setDate(alertDate.getDate() - alertDays);
    alertDate.setHours(0, 0, 0, 0);

    if (today < alertDate) continue; // not time yet
    if (today > popEnd) continue;    // already expired

    const daysRemaining = Math.ceil((popEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const resourceName = `${contractor.firstName} ${contractor.lastName}`;

    // Dedup: scoped to this specific resource ID — no name-matching fragility
    const recent = await prisma.notification.findFirst({
      where: {
        type: 'pop_expiring',
        sourceResourceId: contractor.id,
        createdAt: { gte: dedupCutoff },
      },
    });
    if (recent) continue;

    const u = contractor.user!;
    console.log(`[popAlertJob] Notifying ${u.email} — ${resourceName} PoP ends in ${daysRemaining} days`);
    await notifyPopExpiring(u.id, u.email, resourceName, contractor.id, daysRemaining, popEnd);
  }

  console.log('[popAlertJob] Done.');
}

export function startPopAlertJob(): void {
  // Run once at startup, then once per day
  runPopAlertCheck().catch(console.error);
  setInterval(() => runPopAlertCheck().catch(console.error), 24 * 60 * 60 * 1000);
  console.log('[popAlertJob] Scheduled — runs daily.');
}
