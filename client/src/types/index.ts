export type AppRole = 'viewer' | 'editor' | 'admin';
export type Division = 'operations' | 'engineering' | 'pmso';
export type ResourceType = 'federal' | 'contractor';
export type ProjectStatus = 'in_progress' | 'on_hold' | 'completed';
export type ProjectPriority = 'high' | 'medium' | 'low';

export interface AuthUser {
  id: string;
  caiaId: string;
  email: string;
  displayName: string;
  role: AppRole;
}

export interface Role {
  id: string;
  name: string;
  sortOrder: number;
}

export interface FunctionalArea {
  id: string;
  name: string;
  division: Division | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Resource {
  id: string;
  resourceType: ResourceType;
  firstName: string;
  lastName: string;
  division: Division;
  functionalAreaId: string | null;
  functionalArea: FunctionalArea | null;
  opsEngLead: string | null;
  isSupervisor: boolean;
  supervisorId: string | null;
  supervisor: { id: string; firstName: string; lastName: string } | null;
  secondLineSupervisorId: string | null;
  secondLineSupervisor: { id: string; firstName: string; lastName: string } | null;
  gsLevel: string | null;
  isMatrixed: boolean | null;
  popStartDate: string | null;
  popEndDate: string | null;
  primaryRoleId: string | null;
  primaryRole: Role | null;
  secondaryRoleId: string | null;
  secondaryRole: Role | null;
  availableForWork: boolean;
  notes: string | null;
  isActive: boolean;
  assignments: Assignment[];
  totalPercentUtilized: number;
  availableCapacity: number;
}

export interface Project {
  id: string;
  name: string;
  productId: string | null;
  product: Product | null;
  priority: ProjectPriority | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
  assignments: Assignment[];
  teamSize: number;
  totalUtilization?: number;
}

export interface Assignment {
  id: string;
  resourceId: string;
  resource?: Resource;
  projectId: string;
  project?: Project;
  roleId: string | null;
  role: Role | null;
  percentUtilized: number;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DashboardStats {
  totalResources: number;
  federalCount: number;
  contractorCount: number;
  totalProjects: number;
  activeAssignments: number;
  avgUtilization: number;
  availableResources: number;
  overCapacity: number;
  byDivision: Array<{ division: string; count: number; avgUtilization: number }>;
}
