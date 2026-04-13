import { NotificationType } from '@prisma/client';
import { prisma } from './prisma';

// ─── Email stub (swap implementation when a provider is chosen) ──────────────

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // TODO: plug in Resend / SES / SendGrid here
  console.log(`[email] To: ${to} | Subject: ${subject}\n${body}`);
}

// ─── Preference check ─────────────────────────────────────────────────────────

async function getPrefs(userId: string, type: NotificationType) {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });
  // Default: both channels on if no preference row exists
  return {
    inApp: pref?.inApp ?? true,
    email: pref?.email ?? true,
  };
}

// ─── Core: create one notification for one user ───────────────────────────────

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  opts: {
    linkUrl?: string;
    statusProjectId?: string;
    sourceResourceId?: string;
    recipientEmail?: string;
  } = {},
): Promise<void> {
  const prefs = await getPrefs(userId, type);

  if (!prefs.inApp && !prefs.email) return;

  const data = {
    userId,
    type,
    title,
    message,
    linkUrl: opts.linkUrl ?? null,
    statusProjectId: opts.statusProjectId ?? null,
    sourceResourceId: opts.sourceResourceId ?? null,
  };

  if (prefs.inApp) {
    const notif = await prisma.notification.create({ data });

    if (prefs.email && opts.recipientEmail) {
      await sendEmail(opts.recipientEmail, title, message);
      // Use the captured ID — no race condition
      await prisma.notification.update({ where: { id: notif.id }, data: { emailSent: true } });
    }
  } else if (prefs.email && opts.recipientEmail) {
    // Email-only: still log a row (marked read) so there's an audit record
    await sendEmail(opts.recipientEmail, title, message);
    await prisma.notification.create({ data: { ...data, read: true, emailSent: true } });
  }
}

// ─── Assignment helpers ───────────────────────────────────────────────────────

export async function notifyAssignmentAdded(
  resourceUserId: string,
  resourceEmail: string,
  projectName: string,
  projectId: string,
): Promise<void> {
  await notifyUser(
    resourceUserId,
    'assignment_added',
    `Assigned to ${projectName}`,
    `You have been assigned to the project "${projectName}".`,
    { linkUrl: `/status/projects/${projectId}`, recipientEmail: resourceEmail },
  );
}

export async function notifyAssignmentRemoved(
  resourceUserId: string,
  resourceEmail: string,
  projectName: string,
): Promise<void> {
  await notifyUser(
    resourceUserId,
    'assignment_removed',
    `Removed from ${projectName}`,
    `You have been removed from the project "${projectName}".`,
    { recipientEmail: resourceEmail },
  );
}

// ─── Issue helpers ────────────────────────────────────────────────────────────

export async function notifyAllUsersOfIssue(
  type: 'issue_created' | 'issue_resolved' | 'issue_reopened',
  projectName: string,
  statusProjectId: string,
  issueText: string,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const titleMap = {
    issue_created: `New issue on ${projectName}`,
    issue_resolved: `Issue resolved on ${projectName}`,
    issue_reopened: `Issue reopened on ${projectName}`,
  };
  const msgMap = {
    issue_created: `A new issue was logged on "${projectName}": ${issueText.slice(0, 120)}`,
    issue_resolved: `An issue was resolved on "${projectName}": ${issueText.slice(0, 120)}`,
    issue_reopened: `An issue was reopened on "${projectName}": ${issueText.slice(0, 120)}`,
  };

  await Promise.all(
    users.map((u) =>
      notifyUser(u.id, type, titleMap[type], msgMap[type], {
        linkUrl: `/status/projects/${statusProjectId}`,
        statusProjectId,
      }),
    ),
  );
}

// ─── Project status change helper ─────────────────────────────────────────────

export async function notifyProjectStatusChanged(
  projectName: string,
  statusProjectId: string,
  newStatus: string,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const title = `${projectName} status changed to ${newStatus.toUpperCase()}`;
  const message = `The project "${projectName}" moved to status: ${newStatus}.`;

  await Promise.all(
    users.map((u) =>
      notifyUser(u.id, 'project_status_changed', title, message, {
        linkUrl: `/status/projects/${statusProjectId}`,
        statusProjectId,
      }),
    ),
  );
}

// ─── New status update helper ─────────────────────────────────────────────────

export async function notifyNewUpdate(
  projectName: string,
  statusProjectId: string,
  authorName: string,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const title = `New update on ${projectName}`;
  const message = `${authorName} posted a new status update on "${projectName}".`;

  await Promise.all(
    users.map((u) =>
      notifyUser(u.id, 'new_update', title, message, {
        linkUrl: `/status/projects/${statusProjectId}`,
        statusProjectId,
      }),
    ),
  );
}

// ─── PoP expiry helper (called from cron job) ─────────────────────────────────

export async function notifyPopExpiring(
  resourceUserId: string,
  resourceEmail: string,
  resourceName: string,
  resourceId: string,
  daysRemaining: number,
  popEndDate: Date,
): Promise<void> {
  const formatted = popEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  await notifyUser(
    resourceUserId,
    'pop_expiring',
    `PoP ending in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    `${resourceName}'s Period of Performance ends on ${formatted} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`,
    { recipientEmail: resourceEmail, sourceResourceId: resourceId },
  );
}
