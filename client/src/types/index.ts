export type AppRole = 'viewer' | 'editor' | 'manager' | 'admin';
export type UserType = 'staff' | 'customer';
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
  userType: UserType;
  isIntakeReviewer: boolean;
  isResourceManager: boolean;
  isResourceRequestor: boolean;
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

export type ProductType = 'PLATFORM' | 'APPLICATION' | 'INTEGRATION' | 'SERVICE' | 'MOBILE_APP';
export type ProductStatus = 'ACTIVE' | 'EVALUATING' | 'PLANNED' | 'DEPRECATED' | 'SUNSET';
export type ProductCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'MISSION_CRITICAL';
export type HostingModel = 'SAAS' | 'ON_PREM' | 'HYBRID' | 'GOVT_CLOUD' | 'INTERNAL_HOSTED';
export type AtoStatus = 'AUTHORIZED' | 'PENDING' | 'EXPIRED' | 'NOT_REQUIRED';
export type FedrampLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'NOT_APPLICABLE';
export type DataClassification = 'PUBLIC' | 'SENSITIVE' | 'RESTRICTED';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  productType: ProductType;
  vendor: string | null;
  isInternal: boolean;
  productStatus: ProductStatus;
  criticality: ProductCriticality;
  hostingModel: HostingModel | null;
  platformId: string | null;
  platform?: { id: string; name: string } | null;
  childProducts?: Pick<Product, 'id' | 'name' | 'productType' | 'productStatus' | 'vendor'>[];
  productOwner: string | null;
  technicalOwner: string | null;
  primaryUrl: string | null;
  documentationUrl: string | null;
  logoUrl: string | null;
  userCount: number | null;
  annualCost: number | null;
  contractExpiry: string | null;
  version: string | null;
  atoStatus: AtoStatus | null;
  atoExpiry: string | null;
  fedrampLevel: FedrampLevel | null;
  dataClassification: DataClassification | null;
  isActive: boolean;
  programs?: { program: { id: string; name: string } }[];
  statusProjects?: { statusProject: { id: string; name: string; status: string; programId: string; program?: { name: string } } }[];
  _count?: { statusProjects: number; childProducts: number };
}

export interface RiskCategory {
  id: string;
  name: string;
  sortOrder: number;
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
  popAlertDaysBefore: number | null;
  userId: string | null;
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
  federalProductOwner: string | null;
  customerContact: string | null;
  isActive: boolean;
  assignments: Assignment[];
  teamSize: number;
  totalUtilization?: number;
}

export interface ProjectsDashboardStats {
  total: number;
  inProgress: number;
  onHold: number;
  completed: number;
  endingSoon: number;
  byProduct: { id: string; name: string; count: number }[];
  endingSoonProjects: {
    id: string;
    name: string;
    endDate: string;
    priority: ProjectPriority | null;
    product: { id: string; name: string } | null;
    teamSize: number;
  }[];
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

export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface ResourceRequest {
  id: string;
  requestorId: string;
  requestor: { id: string; displayName: string; email: string };
  projectId: string | null;
  project: { id: string; name: string } | null;
  projectOther: string | null;
  resourceType: ResourceType | null;
  roleId: string | null;
  role: { id: string; name: string } | null;
  functionalAreaId: string | null;
  functionalArea: { id: string; name: string } | null;
  percentNeeded: number | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  status: RequestStatus;
  reviewedBy: { id: string; displayName: string } | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
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
  endingSoonProjects: number;
  byDivision: Array<{ division: string; count: number; avgUtilization: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT STATUS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type StatusProjectStatusType = 'initiated' | 'green' | 'yellow' | 'red' | 'gray';

// ═══════════════════════════════════════════════════════════════════════════════
// INTAKE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type IntakeStatus = 'draft' | 'submitted' | 'under_review' | 'backlog' | 'denied' | 'approved';
export type IntakeDetermination = 'backlog' | 'denied' | 'approved';

export interface IntakeSubmission {
  id: string;
  submitterId: string;
  submitter?: { id: string; displayName: string; email: string };
  title: string;
  status: IntakeStatus;
  currentVersionId: string | null;
  currentVersion?: IntakeSubmissionVersion | null;
  aiScore: number | null;
  aiScoreDetails: any | null;
  aiScoredAt: string | null;
  determination: IntakeDetermination | null;
  determinationNotes: string | null;
  denialReason: string | null;
  determinedById: string | null;
  determinedBy?: { id: string; displayName: string } | null;
  determinedAt: string | null;
  linkedProjectId: string | null;
  linkedProject?: { id: string; name: string; status: string } | null;
  designReviewMd: string | null;
  designReviewGeneratedAt: string | null;
  versions?: IntakeSubmissionVersion[];
  documents?: IntakeDocument[];
  _count?: { versions: number; documents: number };
  createdAt: string;
  updatedAt: string;
}

export interface IntakeSubmissionVersion {
  id: string;
  submissionId: string;
  versionNumber: number;
  formData: Record<string, any>;
  createdAt: string;
  createdById: string;
  createdBy?: { id: string; displayName: string };
}

export interface IntakeDocument {
  id: string;
  submissionId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedById: string;
  uploadedBy?: { id: string; displayName: string };
  uploadedAt: string;
}

export interface IntakeDashboardStats {
  total: number;
  byStatus: Record<IntakeStatus, number>;
  avgScore: number | null;
  recentSubmissions: IntakeSubmission[];
}
export type UpdateCadence = 'weekly' | 'biweekly' | 'monthly';

export interface StatusTrendPoint {
  status: StatusProjectStatusType;
  date: string;
}
export type IssueCategory = 'risk' | 'issue' | 'blocker';
export type RiskProgress = 'open' | 'assumed' | 'escalated_to_issue' | 'mitigated';
export type RiskCriticality = 'critical' | 'high' | 'moderate' | 'low';
export type RiskActionStatus = 'red' | 'yellow' | 'green';
export type RiskStatus = 'off_track' | 'at_risk' | 'on_track' | 'none';
export type NotificationType =
  | 'update_due'
  | 'update_overdue'
  | 'new_update'
  | 'issue_created'
  | 'issue_resolved'
  | 'issue_reopened'
  | 'project_status_changed'
  | 'assignment_added'
  | 'assignment_removed'
  | 'pop_expiring';

export interface Department {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StatusPriority {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ExecutionType {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CustomerCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface RagDefinition {
  id: string;
  color: string;
  label: string;
  description: string | null;
  isActive: boolean;
}

export interface StatusPhase {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  owner: string | null;
  budget: number | null;
  isActive: boolean;
  programs?: Program[];
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  federalOwner: string | null;
  portfolioId: string;
  portfolio?: Portfolio;
  isActive: boolean;
  products?: { product: Pick<Product, 'id' | 'name' | 'productType' | 'productStatus' | 'vendor' | 'logoUrl'> & { _count?: { statusProjects: number } } }[];
  statusProjects?: StatusProject[];
}

export interface StatusProject {
  id: string;
  name: string;
  description: string | null;
  programId: string;
  program?: Program;
  products?: { product: { id: string; name: string; productType?: string; logoUrl?: string | null } }[];
  federalProductOwner: string | null;
  customerContact: string | null;
  departmentId: string | null;
  department?: Department | null;
  priorityId: string | null;
  priority?: StatusPriority | null;
  executionTypeId: string | null;
  executionType?: ExecutionType | null;
  customerCategoryId: string | null;
  customerCategory?: CustomerCategory | null;
  phaseId: string | null;
  phase?: StatusPhase | null;
  staffingProjectId: string | null;
  staffingProject?: { id: string; name: string } | null;
  status: StatusProjectStatusType;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  funded: boolean;
  updateCadence: UpdateCadence;
  nextUpdateDue: string | null;
  isActive: boolean;
  phases?: ProjectPhase[];
  updates?: StatusUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface RiskMitigationAction {
  id: string;
  riskId: string;
  stepOwnerId?: string | null;
  stepOwner?: { id: string; firstName: string; lastName: string } | null;
  title: string;
  dueDate: string | null;
  status: RiskActionStatus;
  isComplete: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RiskComment {
  id: string;
  riskId: string;
  authorId: string;
  author?: { id: string; displayName: string };
  text: string;
  createdAt: string;
}

export interface Risk {
  id: string;
  riskCode: string;
  progress: RiskProgress;
  programId: string;
  program?: Program;
  statusProjectId: string;
  statusProject?: { id: string; name: string; programId?: string };
  categoryId: string;
  category?: RiskCategory;
  spmId: string | null;
  riskOwnerId: string | null;
  riskOwner?: { id: string; firstName: string; lastName: string } | null;
  title: string;
  statement: string;
  criticality: RiskCriticality;
  submitterId: string;
  submitter?: { id: string; displayName: string; email?: string };
  dateIdentified: string | null;
  probability: number | null;
  impact: string | null;
  impactDate: string | null;
  closureCriteria: string | null;
  escalatedAt: string | null;
  mitigationActions?: RiskMitigationAction[];
  comments?: RiskComment[];
  _count?: { comments: number; mitigationActions: number };
  createdAt: string;
  updatedAt: string;
}

export interface RisksDashboardStats {
  totalRisks: number;
  impactingSoon: number;
  withoutMitigationPlan: number;
  byProgress: { open: number; assumed: number; escalated_to_issue: number; mitigated: number };
  byCriticality: { critical: number; high: number; moderate: number; low: number };
  byProgram: Array<{ id: string; name: string; totalCount: number; criticalCount: number; openCount: number }>;
}

export interface IssuesDashboardStats {
  totalIssues: number;
  byCriticality: { critical: number; high: number; moderate: number; low: number };
  byProgram: Array<{ id: string; name: string; count: number }>;
}

export interface ProjectPhase {
  id: string;
  statusProjectId: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string | null;
  sortOrder: number;
}

export interface StatusUpdate {
  id: string;
  statusProjectId: string;
  authorId: string;
  author?: { id: string; displayName: string };
  overallStatus: StatusProjectStatusType;
  summary: string;
  risks: string | null;
  blockers: string | null;
  createdAt: string;
}

export interface Accomplishment {
  id: string;
  statusProjectId: string;
  authorId: string;
  author?: { id: string; displayName: string };
  text: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  statusProjectId: string;
  uploadedById: string;
  uploadedBy?: { id: string; displayName: string };
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  statusProjectId: string | null;
  read: boolean;
  emailSent: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

export interface StatusDashboardStats {
  totalProjects: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  grayCount: number;
  overdueUpdates: number;
  programSummaries: Array<{
    id: string;
    name: string;
    projectCount: number;
    worstStatus: StatusProjectStatusType;
    lastUpdateDate: string | null;
  }>;
  upcomingMilestones: Array<{
    projectId: string;
    projectName: string;
    phaseName: string;
    endDate: string;
  }>;
}
