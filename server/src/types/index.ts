import { Request } from 'express';

export type AppRoleType = 'viewer' | 'editor' | 'manager' | 'admin';
export type UserTypeType = 'staff' | 'customer';

export interface AuthUser {
  id: string;
  caiaId: string;
  email: string;
  displayName: string;
  role: AppRoleType;
  userType: UserTypeType;
  isIntakeReviewer: boolean;
  isResourceManager: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}
