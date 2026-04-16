import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const MOCK_CAIA = process.env.MOCK_CAIA === 'true';

function issueToken(user: { id: string; caiaId: string; email: string; displayName: string; role: string; userType: string; isIntakeReviewer: boolean; isResourceManager: boolean }): string {
  return jwt.sign(
    { id: user.id, caiaId: user.caiaId, email: user.email, displayName: user.displayName, role: user.role, userType: user.userType, isIntakeReviewer: user.isIntakeReviewer, isResourceManager: user.isResourceManager },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

authRouter.post('/mock-login', async (req: Request, res: Response, next: NextFunction) => {
  if (!MOCK_CAIA) {
    next(new AppError('Mock login is disabled', 403));
    return;
  }

  const { caiaId } = req.body as { caiaId?: string };
  if (!caiaId) {
    next(new AppError('caiaId is required', 400));
    return;
  }

  const user = await prisma.user.findUnique({ where: { caiaId } });
  if (!user || !user.isActive) {
    next(new AppError('User not found or inactive', 401));
    return;
  }

  const token = issueToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ data: { token, user: { id: user.id, caiaId: user.caiaId, email: user.email, displayName: user.displayName, role: user.role, userType: user.userType, isIntakeReviewer: user.isIntakeReviewer, isResourceManager: user.isResourceManager } } });
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, caiaId: true, email: true, displayName: true, role: true, userType: true, isIntakeReviewer: true, isResourceManager: true, isActive: true },
  });
  if (!user) {
    next(new AppError('User not found', 404));
    return;
  }
  res.json({ data: user });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});
