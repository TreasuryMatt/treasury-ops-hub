import { Router, Response, NextFunction } from 'express';
import { NotificationType } from '@prisma/client';
import { prisma } from '../services/prisma';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// GET /api/notifications?cursor=<id>&limit=<n>&filter=all|unread
notificationsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const cursor = req.query.cursor as string | undefined;
  const filter = req.query.filter as string | undefined;

  const where: any = { userId: req.user!.id };
  if (filter === 'unread') where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);

  const hasMore = notifications.length > limit;
  const data = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  res.json({ data, unreadCount, nextCursor });
});

// PATCH /api/notifications/read-all  — must be before /:id
notificationsRouter.patch('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ message: 'All marked as read' });
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id as string } });
    if (!notification || notification.userId !== req.user!.id) {
      return next(new AppError('Not found', 404));
    }
    await prisma.notification.update({ where: { id: req.params.id as string }, data: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/notifications/:id
notificationsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id as string } });
    if (!notification || notification.userId !== req.user!.id) {
      return next(new AppError('Not found', 404));
    }
    await prisma.notification.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/notifications — delete all read notifications for current user
notificationsRouter.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  await prisma.notification.deleteMany({
    where: { userId: req.user!.id, read: true },
  });
  res.json({ message: 'Read notifications cleared' });
});

// GET /api/notifications/preferences
notificationsRouter.get('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: req.user!.id },
  });
  res.json({ data: prefs });
});

// PUT /api/notifications/preferences
// Body: [{ type, inApp, email }, ...]
notificationsRouter.put('/preferences', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updates: Array<{ type: NotificationType; inApp: boolean; email: boolean }> = req.body;

    await Promise.all(
      updates.map(({ type, inApp, email }) =>
        prisma.notificationPreference.upsert({
          where: { userId_type: { userId: req.user!.id, type } },
          create: { userId: req.user!.id, type, inApp, email },
          update: { inApp, email },
        }),
      ),
    );

    const prefs = await prisma.notificationPreference.findMany({ where: { userId: req.user!.id } });
    res.json({ data: prefs });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
