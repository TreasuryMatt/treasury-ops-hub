import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthUser, AppRoleType } from '../types';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    next(new AppError('Unauthorized', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function requireRole(...roles: AppRoleType[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Unauthorized', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole('admin')(req, res, next);
}

export function requireEditor(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole('editor', 'manager', 'admin')(req, res, next);
}

export function requireManager(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Unauthorized', 401));
    return;
  }
  if (!req.user.isResourceManager && req.user.role !== 'manager' && req.user.role !== 'admin') {
    next(new AppError('Forbidden — Resource Manager access required', 403));
    return;
  }
  next();
}

export function requireIntakeReviewer(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Unauthorized', 401));
    return;
  }
  if (!req.user.isIntakeReviewer && req.user.role !== 'admin') {
    next(new AppError('Forbidden — Intake Reviewer access required', 403));
    return;
  }
  next();
}
