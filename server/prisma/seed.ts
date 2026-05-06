import 'dotenv/config';
import { AppRole, Prisma, PrismaClient, UserType } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_TAG = '[seed-demo-data]';

type RefMaps = {
  roles: Record<string, string>;
  functionalAreas: Record<string, string>;
  products: Record<string, string>;
  departments: Record<string, string>;
  priorities: Record<string, string>;
  executionTypes: Record<string, string>;
  customerCategories: Record<string, string>;
  statusPhases: Record<string, string>;
  portfolios: Record<string, string>;
  programs: Record<string, string>;
  users: Record<string, string>;
};

function withDayOffset(base: Date, offset: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + offset);
  return next;
}

function withMonthOffset(base: Date, offset: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + offset);
  return next;
}

function toRecord<T extends { name: string; id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.name, item.id]));
}

function jsonOrDbNull(value: Prisma.InputJsonValue | null) {
  return value === null ? Prisma.DbNull : value;
}

async function upsertUser(data: {
  caiaId: string;
  email: string;
  displayName: string;
  role?: AppRole;
  userType?: UserType;
  isIntakeReviewer?: boolean;
  isResourceManager?: boolean;
  isActive?: boolean;
}) {
  return prisma.user.upsert({
    where: { caiaId: data.caiaId },
    update: {
      email: data.email,
      displayName: data.displayName,
      role: data.role ?? AppRole.viewer,
      userType: data.userType ?? UserType.staff,
      isIntakeReviewer: data.isIntakeReviewer ?? false,
      isResourceManager: data.isResourceManager ?? false,
      isActive: data.isActive ?? true,
    },
    create: {
      caiaId: data.caiaId,
      email: data.email,
      displayName: data.displayName,
      role: data.role ?? AppRole.viewer,
      userType: data.userType ?? UserType.staff,
      isIntakeReviewer: data.isIntakeReviewer ?? false,
      isResourceManager: data.isResourceManager ?? false,
      isActive: data.isActive ?? true,
    },
  });
}

async function upsertProject(data: {
  name: string;
  productId: string;
  priority?: 'high' | 'medium' | 'low' | null;
  status: 'in_progress' | 'on_hold' | 'completed';
  startDate?: Date | null;
  endDate?: Date | null;
  description?: string | null;
  federalProductOwner?: string | null;
  customerContact?: string | null;
}) {
  return prisma.project.upsert({
    where: { name_productId: { name: data.name, productId: data.productId } },
    update: {
      priority: data.priority ?? null,
      status: data.status,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      description: data.description ?? null,
      federalProductOwner: data.federalProductOwner ?? null,
      customerContact: data.customerContact ?? null,
      isActive: true,
    },
    create: {
      name: data.name,
      productId: data.productId,
      priority: data.priority ?? null,
      status: data.status,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      description: data.description ?? null,
      federalProductOwner: data.federalProductOwner ?? null,
      customerContact: data.customerContact ?? null,
      isActive: true,
    },
  });
}

async function ensureStatusProject(data: {
  name: string;
  description: string;
  programId: string;
  staffingProjectId?: string | null;
  federalProductOwner?: string | null;
  customerContact?: string | null;
  departmentId?: string | null;
  priorityId?: string | null;
  executionTypeId?: string | null;
  customerCategoryId?: string | null;
  phaseId?: string | null;
  status: 'initiated' | 'green' | 'yellow' | 'red' | 'gray';
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  funded: boolean;
  updateCadence: 'weekly' | 'biweekly' | 'monthly';
  nextUpdateDue?: Date | null;
}) {
  const existing = data.staffingProjectId
    ? await prisma.statusProject.findUnique({ where: { staffingProjectId: data.staffingProjectId } })
    : await prisma.statusProject.findFirst({
        where: { name: data.name, programId: data.programId },
      });

  if (existing) {
    return prisma.statusProject.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description,
        programId: data.programId,
        staffingProjectId: data.staffingProjectId ?? null,
        federalProductOwner: data.federalProductOwner ?? null,
        customerContact: data.customerContact ?? null,
        departmentId: data.departmentId ?? null,
        priorityId: data.priorityId ?? null,
        executionTypeId: data.executionTypeId ?? null,
        customerCategoryId: data.customerCategoryId ?? null,
        phaseId: data.phaseId ?? null,
        status: data.status,
        plannedStartDate: data.plannedStartDate ?? null,
        plannedEndDate: data.plannedEndDate ?? null,
        actualStartDate: data.actualStartDate ?? null,
        actualEndDate: data.actualEndDate ?? null,
        funded: data.funded,
        updateCadence: data.updateCadence,
        nextUpdateDue: data.nextUpdateDue ?? null,
        isActive: true,
      },
    });
  }

  return prisma.statusProject.create({
    data: {
      name: data.name,
      description: data.description,
      programId: data.programId,
      staffingProjectId: data.staffingProjectId ?? null,
      federalProductOwner: data.federalProductOwner ?? null,
      customerContact: data.customerContact ?? null,
      departmentId: data.departmentId ?? null,
      priorityId: data.priorityId ?? null,
      executionTypeId: data.executionTypeId ?? null,
      customerCategoryId: data.customerCategoryId ?? null,
      phaseId: data.phaseId ?? null,
      status: data.status,
      plannedStartDate: data.plannedStartDate ?? null,
      plannedEndDate: data.plannedEndDate ?? null,
      actualStartDate: data.actualStartDate ?? null,
      actualEndDate: data.actualEndDate ?? null,
      funded: data.funded,
      updateCadence: data.updateCadence,
      nextUpdateDue: data.nextUpdateDue ?? null,
      isActive: true,
    },
  });
}

async function seedReferenceData() {
  const roleNames = [
    'Administrative Assistant',
    'Architect',
    'Business Analyst',
    'Business Product Owner',
    'Communications',
    'Configuration Management',
    'Content Management',
    'Contract Management',
    'Data Analyst',
    'Designer',
    'Developer',
    'Director',
    'Engineer',
    'Engineer - Cybersecurity',
    'Help Desk',
    'Information Technology',
    'Knowledge Management',
    'Operations Management',
    'PMSO',
    'Program Manager',
    'Project Manager',
    'Publisher',
    'Quality Assurance/Tester',
    'Release Management',
    'Researcher',
    'Senior Business Analyst',
    'Senior Project Manager',
    'Staff Assistant',
    'Supervisor',
    'System Admin',
    'Technical Operations',
    'Technical Writer',
    'User Interface/User Experience',
  ];

  for (let i = 0; i < roleNames.length; i += 1) {
    await prisma.role.upsert({
      where: { name: roleNames[i] },
      update: { sortOrder: i },
      create: { name: roleNames[i], sortOrder: i },
    });
  }

  const functionalAreas = [
    { name: 'Back Office Software', division: null },
    { name: 'Financial Management', division: null },
    { name: 'HR Modernization', division: null },
    { name: 'Public Web', division: null },
    { name: 'Procurement', division: null },
    { name: 'Project Management Tools', division: null },
    { name: 'Cybersecurity Applications', division: null },
    { name: 'AI & Enterprise Developer Tools', division: null },
    { name: 'Digital Design and Experience', division: null },
    { name: 'Platform Operations', division: null },
    { name: 'Communications', division: null },
    { name: 'Governance', division: null },
    { name: 'Portfolio Management', division: null },
    { name: 'Program Operations', division: null },
    { name: 'Project Management', division: null },
    { name: 'Resource Management', division: null },
  ];

  for (let i = 0; i < functionalAreas.length; i += 1) {
    await prisma.functionalArea.upsert({
      where: { name: functionalAreas[i].name },
      update: {
        division: functionalAreas[i].division as any,
        sortOrder: i,
      },
      create: {
        name: functionalAreas[i].name,
        division: functionalAreas[i].division as any,
        sortOrder: i,
      },
    });
  }

  const productDefs = [
    {
      name: 'ServiceNow',
      description: 'Enterprise ITSM platform used across Treasury for service request management, incident tracking, and workflow automation.',
      productType: 'PLATFORM' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'ServiceNow',
      isInternal: false,
      criticality: 'MISSION_CRITICAL' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Marcus Hale',
      technicalOwner: 'Priya Raman',
      primaryUrl: 'https://treasury.service-now.com',
      documentationUrl: 'https://docs.servicenow.com',
      userCount: 3200,
      annualCost: 1850000,
      contractExpiry: new Date('2026-09-30'),
      version: 'Washington DC',
      atoStatus: 'AUTHORIZED' as const,
      atoExpiry: new Date('2026-06-15'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Adjudication Trackers',
      description: 'Internal case-tracking tool used by adjudication staff to manage and disposition incoming requests against defined criteria.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'HIGH' as const,
      hostingModel: 'INTERNAL_HOSTED' as const,
      productOwner: 'Janelle Price',
      technicalOwner: 'Ethan Cole',
      userCount: 145,
      annualCost: 220000,
      atoStatus: 'AUTHORIZED' as const,
      atoExpiry: new Date('2025-12-31'),
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'AIRS',
      description: 'Automated Intake and Routing System — routes incoming service requests to the correct team based on classification rules.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'Salesforce',
      isInternal: false,
      criticality: 'HIGH' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Olivia Stone',
      technicalOwner: 'Marcus Hale',
      primaryUrl: 'https://treasury.my.salesforce.com/airs',
      userCount: 820,
      annualCost: 560000,
      contractExpiry: new Date('2026-03-31'),
      atoStatus: 'AUTHORIZED' as const,
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Architecture & Integration',
      description: 'Middleware and integration layer connecting Treasury line-of-business systems. Manages API gateway, event bus, and canonical data models.',
      productType: 'INTEGRATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'MISSION_CRITICAL' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Priya Raman',
      technicalOwner: 'Ethan Cole',
      userCount: 0,
      annualCost: 410000,
      atoStatus: 'AUTHORIZED' as const,
      fedrampLevel: 'HIGH' as const,
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'BFS Existing Work',
      description: 'Legacy Bureau of Fiscal Service applications maintained under a time-and-materials O&M contract pending migration planning.',
      productType: 'APPLICATION' as const,
      productStatus: 'DEPRECATED' as const,
      vendor: 'Accenture Federal',
      isInternal: false,
      criticality: 'MEDIUM' as const,
      hostingModel: 'ON_PREM' as const,
      productOwner: 'Henry Ward',
      technicalOwner: 'Sophia Nguyen',
      userCount: 310,
      annualCost: 980000,
      contractExpiry: new Date('2025-09-30'),
      atoStatus: 'EXPIRED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Connect.gov',
      description: 'Federal identity and authentication gateway enabling citizens to access Treasury digital services with a single verified credential.',
      productType: 'INTEGRATION' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'GSA / Login.gov',
      isInternal: false,
      criticality: 'HIGH' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Olivia Stone',
      technicalOwner: 'Priya Raman',
      primaryUrl: 'https://connect.gov',
      documentationUrl: 'https://developers.login.gov',
      userCount: 45000,
      annualCost: 320000,
      fedrampLevel: 'HIGH' as const,
      dataClassification: 'PUBLIC' as const,
      atoStatus: 'AUTHORIZED' as const,
    },
    {
      name: 'Content Management',
      description: 'Drupal-based CMS powering Treasury public-facing websites, intranet pages, and policy document repositories.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'Acquia',
      isInternal: false,
      criticality: 'MEDIUM' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Sophia Nguyen',
      technicalOwner: 'Ethan Cole',
      primaryUrl: 'https://cms.treasury.gov',
      userCount: 220,
      annualCost: 175000,
      contractExpiry: new Date('2026-01-31'),
      version: 'Drupal 10',
      atoStatus: 'AUTHORIZED' as const,
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'PUBLIC' as const,
    },
    {
      name: 'DCFO',
      description: 'Deputy CFO financial operations dashboard providing real-time visibility into appropriations, obligations, and expenditures across bureaus.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'HIGH' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Priya Raman',
      technicalOwner: 'Marcus Hale',
      userCount: 95,
      annualCost: 340000,
      atoStatus: 'AUTHORIZED' as const,
      atoExpiry: new Date('2026-08-31'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'Discovery',
      description: 'Internal research and cataloging tool used by program teams to document service inventories, stakeholder maps, and as-is process flows.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'LOW' as const,
      hostingModel: 'INTERNAL_HOSTED' as const,
      productOwner: 'Henry Ward',
      technicalOwner: 'Janelle Price',
      userCount: 68,
      annualCost: 85000,
      atoStatus: 'AUTHORIZED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'eDiscovery',
      description: 'Electronic discovery platform used by Office of General Counsel to manage legal holds, document review, and litigation response.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'Relativity',
      isInternal: false,
      criticality: 'HIGH' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Sophia Nguyen',
      technicalOwner: 'Priya Raman',
      userCount: 55,
      annualCost: 290000,
      contractExpiry: new Date('2026-06-30'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'RESTRICTED' as const,
      atoStatus: 'AUTHORIZED' as const,
    },
    {
      name: 'eDiscovery/FOIAxPress',
      description: 'Legacy FOIA request management system. Replaced by the unified eDiscovery platform; currently in wind-down with read-only access preserved.',
      productType: 'APPLICATION' as const,
      productStatus: 'SUNSET' as const,
      vendor: 'IPRO Tech',
      isInternal: false,
      criticality: 'LOW' as const,
      hostingModel: 'ON_PREM' as const,
      productOwner: 'Henry Ward',
      technicalOwner: 'Ethan Cole',
      userCount: 12,
      annualCost: 0,
      atoStatus: 'EXPIRED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'IHRITT',
      description: 'Integrated HR IT Transformation platform consolidating personnel action processing, position management, and onboarding workflows.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'HIGH' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Janelle Price',
      technicalOwner: 'Marcus Hale',
      userCount: 480,
      annualCost: 720000,
      atoStatus: 'AUTHORIZED' as const,
      atoExpiry: new Date('2027-01-31'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'IRS Discovery',
      description: 'Pilot evaluation of IRS-developed discovery tooling for potential adoption across Treasury bureaus. Currently in proof-of-concept phase.',
      productType: 'APPLICATION' as const,
      productStatus: 'EVALUATING' as const,
      vendor: 'IRS / Internal',
      isInternal: false,
      criticality: 'LOW' as const,
      hostingModel: 'HYBRID' as const,
      productOwner: 'Olivia Stone',
      technicalOwner: 'Ethan Cole',
      userCount: 8,
      atoStatus: 'PENDING' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Mint Transition',
      description: 'Workstream managing the technical wind-down of US Mint legacy systems as operations transfer to consolidated Treasury infrastructure.',
      productType: 'SERVICE' as const,
      productStatus: 'SUNSET' as const,
      isInternal: true,
      criticality: 'MEDIUM' as const,
      hostingModel: 'ON_PREM' as const,
      productOwner: 'Henry Ward',
      technicalOwner: 'Sophia Nguyen',
      userCount: 24,
      annualCost: 150000,
      atoStatus: 'EXPIRED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'O&M (SF)',
      description: 'Operations and maintenance workstream for Salesforce-based applications including case management, contact centers, and citizen portals.',
      productType: 'SERVICE' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'Salesforce',
      isInternal: false,
      criticality: 'HIGH' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Marcus Hale',
      technicalOwner: 'Priya Raman',
      userCount: 1100,
      annualCost: 1200000,
      contractExpiry: new Date('2026-09-30'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'SENSITIVE' as const,
      atoStatus: 'AUTHORIZED' as const,
    },
    {
      name: 'O&M (SNOW)',
      description: 'Operations and maintenance workstream for ServiceNow modules including ITSM, HRSD, and custom Treasury workflow applications.',
      productType: 'SERVICE' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'ServiceNow',
      isInternal: false,
      criticality: 'MISSION_CRITICAL' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Marcus Hale',
      technicalOwner: 'Ethan Cole',
      userCount: 3200,
      annualCost: 2100000,
      contractExpiry: new Date('2026-09-30'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'SENSITIVE' as const,
      atoStatus: 'AUTHORIZED' as const,
    },
    {
      name: 'OneFM',
      description: 'Unified financial management system consolidating budget formulation, execution tracking, and reporting for DO offices.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'MISSION_CRITICAL' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Priya Raman',
      technicalOwner: 'Janelle Price',
      userCount: 260,
      annualCost: 890000,
      atoStatus: 'AUTHORIZED' as const,
      atoExpiry: new Date('2026-11-30'),
      fedrampLevel: 'HIGH' as const,
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'P4P',
      description: 'Pay for Performance system under design to replace legacy performance rating processes with a modern, configurable evaluation workflow.',
      productType: 'APPLICATION' as const,
      productStatus: 'PLANNED' as const,
      isInternal: true,
      criticality: 'MEDIUM' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Janelle Price',
      technicalOwner: 'Marcus Hale',
      atoStatus: 'PENDING' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Platform Enhancements & Support',
      description: 'Ongoing platform engineering workstream delivering shared capabilities, developer tooling, and infrastructure improvements across product lines.',
      productType: 'PLATFORM' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'HIGH' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Janelle Price',
      technicalOwner: 'Ethan Cole',
      userCount: 0,
      annualCost: 640000,
      atoStatus: 'AUTHORIZED' as const,
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'PMSO',
      description: 'Program Management Support Office toolset providing project tracking, milestone reporting, and resource allocation dashboards to PMOs.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'MEDIUM' as const,
      hostingModel: 'INTERNAL_HOSTED' as const,
      productOwner: 'Olivia Stone',
      technicalOwner: 'Sophia Nguyen',
      userCount: 115,
      annualCost: 195000,
      atoStatus: 'AUTHORIZED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Portals/Events',
      description: 'Treasury citizen and partner portal platform supporting event registration, stakeholder communications, and self-service information access.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'Salesforce',
      isInternal: false,
      criticality: 'MEDIUM' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Sophia Nguyen',
      technicalOwner: 'Marcus Hale',
      primaryUrl: 'https://portal.treasury.gov',
      userCount: 8400,
      annualCost: 310000,
      contractExpiry: new Date('2026-03-31'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'PUBLIC' as const,
      atoStatus: 'AUTHORIZED' as const,
    },
    {
      name: 'Rules of Behavior',
      description: 'Annual cybersecurity Rules of Behavior acknowledgment system. All Treasury IT users must complete acknowledgment to maintain system access.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'MEDIUM' as const,
      hostingModel: 'INTERNAL_HOSTED' as const,
      productOwner: 'Priya Raman',
      technicalOwner: 'Ethan Cole',
      userCount: 4100,
      annualCost: 45000,
      atoStatus: 'NOT_REQUIRED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'ServiceNow Next Experience Upgrade',
      description: 'Evaluation and implementation planning for ServiceNow Next Experience UI migration. Scope includes workspace redesign and portal modernization.',
      productType: 'APPLICATION' as const,
      productStatus: 'EVALUATING' as const,
      vendor: 'ServiceNow',
      isInternal: false,
      criticality: 'MEDIUM' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Marcus Hale',
      technicalOwner: 'Priya Raman',
      atoStatus: 'NOT_REQUIRED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
    {
      name: 'Software Management',
      description: 'Software asset management platform tracking licenses, entitlements, and version compliance across Treasury bureau software portfolios.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      vendor: 'Snow Software',
      isInternal: false,
      criticality: 'MEDIUM' as const,
      hostingModel: 'SAAS' as const,
      productOwner: 'Henry Ward',
      technicalOwner: 'Ethan Cole',
      userCount: 42,
      annualCost: 130000,
      contractExpiry: new Date('2025-12-31'),
      fedrampLevel: 'LOW' as const,
      dataClassification: 'SENSITIVE' as const,
      atoStatus: 'AUTHORIZED' as const,
    },
    {
      name: 'TEI',
      description: 'Treasury Enterprise Integration hub providing standardized data exchange between payroll, HR, and financial systems via secure API contracts.',
      productType: 'INTEGRATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'MISSION_CRITICAL' as const,
      hostingModel: 'GOVT_CLOUD' as const,
      productOwner: 'Priya Raman',
      technicalOwner: 'Marcus Hale',
      userCount: 0,
      annualCost: 520000,
      atoStatus: 'AUTHORIZED' as const,
      fedrampLevel: 'HIGH' as const,
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'TRAMS/OCA',
      description: 'Treasury Reporting and Management System / Office of Chief Accountant. Financial statement compilation, audit support, and GAAP reporting.',
      productType: 'APPLICATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'HIGH' as const,
      hostingModel: 'ON_PREM' as const,
      productOwner: 'Janelle Price',
      technicalOwner: 'Sophia Nguyen',
      userCount: 88,
      annualCost: 670000,
      atoStatus: 'AUTHORIZED' as const,
      atoExpiry: new Date('2026-05-31'),
      fedrampLevel: 'MODERATE' as const,
      dataClassification: 'RESTRICTED' as const,
    },
    {
      name: 'Txcess/WSD/Nuvolo/Impress',
      description: 'Bundled workstream covering Treasury excess property (Txcess), workspace design (WSD), facilities management (Nuvolo), and print services (Impress).',
      productType: 'INTEGRATION' as const,
      productStatus: 'ACTIVE' as const,
      isInternal: true,
      criticality: 'LOW' as const,
      hostingModel: 'HYBRID' as const,
      productOwner: 'Henry Ward',
      technicalOwner: 'Janelle Price',
      userCount: 195,
      annualCost: 385000,
      atoStatus: 'AUTHORIZED' as const,
      dataClassification: 'SENSITIVE' as const,
    },
  ];

  for (const def of productDefs) {
    await prisma.product.upsert({
      where: { name: def.name },
      update: { isActive: true, ...def },
      create: { isActive: true, ...def },
    });
  }

  const baselineUsers = [
    { caiaId: 'ADMIN001', email: 'admin@treasury.gov', displayName: 'System Admin', role: AppRole.admin, userType: UserType.staff, isIntakeReviewer: true, isResourceManager: true },
    { caiaId: 'EDIT001', email: 'editor@treasury.gov', displayName: 'Test Editor', role: AppRole.editor, userType: UserType.staff },
    { caiaId: 'VIEW001', email: 'viewer@treasury.gov', displayName: 'Test Viewer', role: AppRole.viewer, userType: UserType.staff },
    { caiaId: 'REVIEW01', email: 'reviewer@treasury.gov', displayName: 'Intake Reviewer', role: AppRole.editor, userType: UserType.staff, isIntakeReviewer: true },
    { caiaId: 'RMGR001', email: 'resourcemgr@treasury.gov', displayName: 'Resource Manager', role: AppRole.viewer, userType: UserType.staff, isResourceManager: true },
    { caiaId: 'CUST001', email: 'customer1@treasury.gov', displayName: 'Alice Customer', role: AppRole.viewer, userType: UserType.customer },
    { caiaId: 'CUST002', email: 'customer2@treasury.gov', displayName: 'Bob Customer', role: AppRole.viewer, userType: UserType.customer },
    { caiaId: 'MGR001', email: 'manager@treasury.gov', displayName: 'Legacy Manager (Inactive)', role: AppRole.viewer, userType: UserType.staff, isActive: false },
  ];

  for (const user of baselineUsers) {
    await upsertUser(user);
  }

  const demoUsers = [
    ['DEMOR001', 'olivia.stone@treasury.gov', 'Olivia Stone'],
    ['DEMOR002', 'marcus.hale@treasury.gov', 'Marcus Hale'],
    ['DEMOR003', 'janelle.price@treasury.gov', 'Janelle Price'],
    ['DEMOR004', 'ethan.cole@treasury.gov', 'Ethan Cole'],
    ['DEMOR005', 'priya.raman@treasury.gov', 'Priya Raman'],
    ['DEMOR006', 'noah.bennett@treasury.gov', 'Noah Bennett'],
    ['DEMOR007', 'sophia.nguyen@treasury.gov', 'Sophia Nguyen'],
    ['DEMOR008', 'carlos.reyes@treasury.gov', 'Carlos Reyes'],
    ['DEMOR009', 'maya.patel@treasury.gov', 'Maya Patel'],
    ['DEMOR010', 'liam.turner@treasury.gov', 'Liam Turner'],
    ['DEMOR011', 'zoe.mitchell@treasury.gov', 'Zoe Mitchell'],
    ['DEMOR012', 'henry.ward@treasury.gov', 'Henry Ward'],
  ] as const;

  for (const [caiaId, email, displayName] of demoUsers) {
    await upsertUser({
      caiaId,
      email,
      displayName,
      role: AppRole.viewer,
      userType: UserType.staff,
    });
  }

  const departmentNames = [
    'TEOAF',
    'BFS',
    'BPD',
    'DO',
    'FMS',
    'IRS',
    'Mint',
    'OCC',
    'OIG',
    'SIGTARP',
    'TTB',
    'FinCEN',
    'OFAC',
    'OTS',
    'CDFI',
  ];

  for (const name of departmentNames) {
    await prisma.department.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const priorities = [
    { name: '1 - Critical', sortOrder: 1 },
    { name: '2 - High', sortOrder: 2 },
    { name: '3 - Medium', sortOrder: 3 },
    { name: '4 - Low', sortOrder: 4 },
  ];

  for (const priority of priorities) {
    await prisma.statusPriority.upsert({
      where: { name: priority.name },
      update: { sortOrder: priority.sortOrder, isActive: true },
      create: priority,
    });
  }

  const executionTypes = ['Waterfall', 'Agile', 'Hybrid', 'SAFe'];
  for (const name of executionTypes) {
    await prisma.executionType.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const customerCategories = ['Departmental Offices', 'Bureaus', 'External', 'Internal'];
  for (const name of customerCategories) {
    await prisma.customerCategory.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const ragDefinitions = [
    { color: 'green', label: 'On Track', description: 'Project is proceeding as planned with no significant issues.' },
    { color: 'yellow', label: 'At Risk', description: 'Project has issues that may impact schedule, scope, or budget if not addressed.' },
    { color: 'red', label: 'Off Track', description: 'Project has critical issues impacting schedule, scope, or budget.' },
    { color: 'gray', label: 'Not Started', description: 'Project has not yet begun execution.' },
  ];

  for (const rag of ragDefinitions) {
    await prisma.ragDefinition.upsert({
      where: { color: rag.color },
      update: rag,
      create: rag,
    });
  }

  const statusPhases = ['Discovery', 'Planning', 'Execution', 'Testing', 'Release', 'Sustainment'];
  for (let i = 0; i < statusPhases.length; i += 1) {
    await prisma.statusPhase.upsert({
      where: { name: statusPhases[i] },
      update: { sortOrder: i, isActive: true },
      create: { name: statusPhases[i], sortOrder: i, isActive: true },
    });
  }

  const riskCategories = [
    'Funding',
    'Compliance',
    'Delivery',
    'Requirement',
    'Resources/Staffing',
    'Schedule',
    'Technical Complexity',
    'Testing',
  ];
  for (let i = 0; i < riskCategories.length; i += 1) {
    await prisma.riskCategory.upsert({
      where: { name: riskCategories[i] },
      update: { sortOrder: i, isActive: true },
      create: { name: riskCategories[i], sortOrder: i, isActive: true },
    });
  }

  const portfolios = [
    { name: 'Demo Citizen Experience Portfolio', description: `${DEMO_TAG} Public-facing modernization work.` },
    { name: 'Demo Shared Services Portfolio', description: `${DEMO_TAG} Shared service delivery and automation.` },
    { name: 'Demo Enterprise Delivery Portfolio', description: `${DEMO_TAG} Cross-cutting operations and delivery.` },
  ];

  for (const portfolio of portfolios) {
    await prisma.portfolio.upsert({
      where: { name: portfolio.name },
      update: { description: portfolio.description, isActive: true },
      create: { ...portfolio, isActive: true },
    });
  }

  const allPortfolios = toRecord(await prisma.portfolio.findMany({ select: { id: true, name: true } }));
  const demoPrograms = [
    {
      name: 'Demo Intake Transformation Program',
      description: `${DEMO_TAG} Intake modernization and workflow orchestration.`,
      federalOwner: 'Olivia Stone',
      logoUrl: null,
      portfolioId: allPortfolios['Demo Citizen Experience Portfolio'],
    },
    {
      name: 'Demo Vendor Operations Program',
      description: `${DEMO_TAG} Vendor and acquisition workflow modernization.`,
      federalOwner: 'Marcus Hale',
      logoUrl: null,
      portfolioId: allPortfolios['Demo Shared Services Portfolio'],
    },
    {
      name: 'Demo AI Enablement Program',
      description: `${DEMO_TAG} Internal AI product delivery and support.`,
      federalOwner: 'Janelle Price',
      logoUrl: null,
      portfolioId: allPortfolios['Demo Enterprise Delivery Portfolio'],
    },
    {
      name: 'Demo Analytics Acceleration Program',
      description: `${DEMO_TAG} Data, reporting, and dashboard modernization.`,
      federalOwner: 'Priya Raman',
      logoUrl: null,
      portfolioId: allPortfolios['Demo Enterprise Delivery Portfolio'],
    },
  ];

  for (const program of demoPrograms) {
    await prisma.program.upsert({
      where: { name: program.name },
      update: { ...program, isActive: true },
      create: { ...program, isActive: true },
    });
  }
}

async function loadRefs(): Promise<RefMaps> {
  const [roles, functionalAreas, products, departments, priorities, executionTypes, customerCategories, statusPhases, portfolios, programs, users] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true } }),
    prisma.functionalArea.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.statusPriority.findMany({ select: { id: true, name: true } }),
    prisma.executionType.findMany({ select: { id: true, name: true } }),
    prisma.customerCategory.findMany({ select: { id: true, name: true } }),
    prisma.statusPhase.findMany({ select: { id: true, name: true } }),
    prisma.portfolio.findMany({ select: { id: true, name: true } }),
    prisma.program.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, caiaId: true } }),
  ]);

  return {
    roles: toRecord(roles),
    functionalAreas: toRecord(functionalAreas),
    products: toRecord(products),
    departments: toRecord(departments),
    priorities: toRecord(priorities),
    executionTypes: toRecord(executionTypes),
    customerCategories: toRecord(customerCategories),
    statusPhases: toRecord(statusPhases),
    portfolios: toRecord(portfolios),
    programs: toRecord(programs),
    users: Object.fromEntries(users.map((user) => [user.caiaId, user.id])),
  };
}

async function seedProjectsAndStatusData(refs: RefMaps) {
  const today = new Date();

  const projectConfigs = [
    {
      name: 'Demo Treasury Intake Modernization',
      productName: 'Connect.gov',
      priority: 'high' as const,
      status: 'in_progress' as const,
      startDate: withMonthOffset(today, -10),
      endDate: withMonthOffset(today, 4),
      description: `${DEMO_TAG} Rebuilds intake routing, triage, and leadership visibility.`,
      federalProductOwner: 'Olivia Stone',
      customerContact: 'Alice Customer',
    },
    {
      name: 'Demo Vendor Oversight Portal',
      productName: 'ServiceNow',
      priority: 'medium' as const,
      status: 'on_hold' as const,
      startDate: withMonthOffset(today, -8),
      endDate: withMonthOffset(today, 3),
      description: `${DEMO_TAG} Centralizes vendor performance, actions, and contract milestones.`,
      federalProductOwner: 'Marcus Hale',
      customerContact: 'Bob Customer',
    },
    {
      name: 'Demo AI Help Desk Assistant',
      productName: 'Platform Enhancements & Support',
      priority: 'high' as const,
      status: 'in_progress' as const,
      startDate: withMonthOffset(today, -5),
      endDate: withMonthOffset(today, 5),
      description: `${DEMO_TAG} Introduces an AI assistant for internal service desk workflows.`,
      federalProductOwner: 'Janelle Price',
      customerContact: 'Resource Manager',
    },
    {
      name: 'Demo Records Automation Rollout',
      productName: 'Content Management',
      priority: 'low' as const,
      status: 'in_progress' as const,
      startDate: withMonthOffset(today, -2),
      endDate: withMonthOffset(today, 7),
      description: `${DEMO_TAG} Automates records intake, routing, and retention workflows.`,
      federalProductOwner: 'Sophia Nguyen',
      customerContact: 'Alice Customer',
    },
    {
      name: 'Demo Grants Analytics Pilot',
      productName: 'DCFO',
      priority: 'medium' as const,
      status: 'completed' as const,
      startDate: withMonthOffset(today, -12),
      endDate: withMonthOffset(today, -1),
      description: `${DEMO_TAG} Pilots analytics dashboards for grant and program leadership.`,
      federalProductOwner: 'Priya Raman',
      customerContact: 'Bob Customer',
    },
    {
      name: 'Demo Executive Reporting Refresh',
      productName: 'Discovery',
      priority: 'low' as const,
      status: 'completed' as const,
      startDate: withMonthOffset(today, -11),
      endDate: withMonthOffset(today, -2),
      description: `${DEMO_TAG} Refreshes monthly executive reporting and dashboard templates.`,
      federalProductOwner: 'Henry Ward',
      customerContact: 'Leadership Council',
    },
  ];

  const projectsByName: Record<string, { id: string }> = {};
  for (const config of projectConfigs) {
    const project = await upsertProject({
      name: config.name,
      productId: refs.products[config.productName],
      priority: config.priority,
      status: config.status,
      startDate: config.startDate,
      endDate: config.endDate,
      description: config.description,
      federalProductOwner: config.federalProductOwner,
      customerContact: config.customerContact,
    });
    projectsByName[config.name] = { id: project.id };
  }

  const statusConfigs = [
    {
      name: 'Demo Treasury Intake Modernization',
      description: `${DEMO_TAG} Healthy modernization effort with an active release train.`,
      programName: 'Demo Intake Transformation Program',
      applicationName: 'Demo Intake Portal',
      staffingProjectName: 'Demo Treasury Intake Modernization',
      productNames: ['Connect.gov', 'Discovery'],
      departmentName: 'DO',
      priorityName: '2 - High',
      executionTypeName: 'Agile',
      customerCategoryName: 'Departmental Offices',
      phaseName: 'Execution',
      status: 'green' as const,
      plannedStartDate: withMonthOffset(today, -10),
      plannedEndDate: withMonthOffset(today, 4),
      actualStartDate: withMonthOffset(today, -10),
      actualEndDate: null,
      funded: true,
      updateCadence: 'weekly' as const,
      nextUpdateDue: withDayOffset(today, 4),
      federalProductOwner: 'Olivia Stone',
      customerContact: 'Alice Customer',
      roadmap: [
        { name: 'Discovery & interviews', startDate: withMonthOffset(today, -11), endDate: withMonthOffset(today, -10), color: '#1b4332' },
        { name: 'Workflow rebuild', startDate: withMonthOffset(today, -10), endDate: withMonthOffset(today, -4), color: '#005ea2' },
        { name: 'Pilot rollout', startDate: withMonthOffset(today, -3), endDate: withMonthOffset(today, 1), color: '#7b3f00' },
        { name: 'Enterprise adoption', startDate: withMonthOffset(today, 1), endDate: withMonthOffset(today, 4), color: '#3d4551' },
      ],
      updates: [
        { createdAt: withDayOffset(today, -300), authorCaiaId: 'ADMIN001', overallStatus: 'green' as const, summary: 'Discovery findings aligned on a single intake path and governance model.', risks: 'Competing bureau terminology required additional workshop time.', blockers: null },
        { createdAt: withDayOffset(today, -120), authorCaiaId: 'EDIT001', overallStatus: 'yellow' as const, summary: 'Pilot environment exposed a backlog in routing rules and analyst queue balancing.', risks: 'Analytics tagging still needed for intake categories.', blockers: 'Need final bureau sign-off on routing ownership.' },
        { createdAt: withDayOffset(today, -6), authorCaiaId: 'EDIT001', overallStatus: 'green' as const, summary: 'Completed this week’s reviewer office-hours sessions and closed the last open pilot training questions.', risks: 'A few late-joining reviewers still need to finish the updated quick-start guide.', blockers: null },
        { createdAt: withDayOffset(today, -3), authorCaiaId: 'REVIEW01', overallStatus: 'green' as const, summary: 'Pilot metrics improved review time by 28% and the next release is on schedule.', risks: 'Light risk around training completion for late-joining reviewers.', blockers: null },
      ],
      issues: [
        { createdAt: withDayOffset(today, -118), authorCaiaId: 'EDIT001', category: 'issue' as const, text: 'Legacy queue mappings did not cover new intake categories.', resolvedAt: withDayOffset(today, -95), resolvedByCaiaId: 'ADMIN001', resolutionNotes: 'Added fallback routing and refreshed the category matrix.' },
        { createdAt: withDayOffset(today, -20), authorCaiaId: 'REVIEW01', category: 'risk' as const, text: 'Two pilot offices have not completed reviewer onboarding.', resolvedAt: null, resolvedByCaiaId: null, resolutionNotes: null },
      ],
      accomplishments: [
        { createdAt: withDayOffset(today, -250), authorCaiaId: 'ADMIN001', text: 'Approved a consolidated intake taxonomy used across three offices.' },
        { createdAt: withDayOffset(today, -2), authorCaiaId: 'REVIEW01', text: 'Pilot dashboard is now showing queue age, approval rate, and reviewer load in one place.' },
      ],
    },
    {
      name: 'Demo Vendor Oversight Portal',
      description: `${DEMO_TAG} Moderately at risk effort with vendor data dependencies.`,
      programName: 'Demo Vendor Operations Program',
      applicationName: 'Demo Vendor Oversight',
      staffingProjectName: 'Demo Vendor Oversight Portal',
      productNames: ['ServiceNow', 'Software Management'],
      departmentName: 'BFS',
      priorityName: '3 - Medium',
      executionTypeName: 'Hybrid',
      customerCategoryName: 'Bureaus',
      phaseName: 'Testing',
      status: 'yellow' as const,
      plannedStartDate: withMonthOffset(today, -8),
      plannedEndDate: withMonthOffset(today, 3),
      actualStartDate: withMonthOffset(today, -7),
      actualEndDate: null,
      funded: true,
      updateCadence: 'monthly' as const,
      nextUpdateDue: withDayOffset(today, -8),
      federalProductOwner: 'Marcus Hale',
      customerContact: 'Bob Customer',
      roadmap: [
        { name: 'Current-state inventory', startDate: withMonthOffset(today, -9), endDate: withMonthOffset(today, -8), color: '#5c1a1a' },
        { name: 'Portal build', startDate: withMonthOffset(today, -8), endDate: withMonthOffset(today, -3), color: '#005ea2' },
        { name: 'Integrated testing', startDate: withMonthOffset(today, -2), endDate: withMonthOffset(today, 1), color: '#7b3f00' },
        { name: 'Production launch', startDate: withMonthOffset(today, 1), endDate: withMonthOffset(today, 3), color: '#1a3a5c' },
      ],
      updates: [
        { createdAt: withDayOffset(today, -240), authorCaiaId: 'ADMIN001', overallStatus: 'green' as const, summary: 'Portal scope approved and initial vendor workflows mapped.', risks: null, blockers: null },
        { createdAt: withDayOffset(today, -85), authorCaiaId: 'EDIT001', overallStatus: 'yellow' as const, summary: 'Integration testing uncovered inconsistent vendor identifiers between source systems.', risks: 'Data cleanup may push launch by one sprint.', blockers: 'Waiting for authoritative vendor ID file from acquisition team.' },
        { createdAt: withDayOffset(today, -4), authorCaiaId: 'EDIT001', overallStatus: 'yellow' as const, summary: 'Acquisition shared a revised vendor crosswalk this week and reconciliation is underway in the test environment.', risks: 'There may still be a small amount of manual cleanup before go-live.', blockers: 'Need final steward validation on the revised identifier mappings.' },
        { createdAt: withDayOffset(today, -38), authorCaiaId: 'EDIT001', overallStatus: 'yellow' as const, summary: 'Testing remains open while vendor master data is reconciled.', risks: 'High likelihood of additional manual reconciliation.', blockers: 'Acquisition data steward approval still pending.' },
      ],
      issues: [
        { createdAt: withDayOffset(today, -83), authorCaiaId: 'EDIT001', category: 'blocker' as const, text: 'Source systems use different vendor identifiers and status codes.', resolvedAt: null, resolvedByCaiaId: null, resolutionNotes: null },
        { createdAt: withDayOffset(today, -60), authorCaiaId: 'ADMIN001', category: 'risk' as const, text: 'Launch communications are not drafted yet.', resolvedAt: withDayOffset(today, -45), resolvedByCaiaId: 'EDIT001', resolutionNotes: 'Program office drafted a launch and training packet.' },
      ],
      accomplishments: [
        { createdAt: withDayOffset(today, -200), authorCaiaId: 'ADMIN001', text: 'Completed a single workflow map for intake, review, and escalations.' },
        { createdAt: withDayOffset(today, -52), authorCaiaId: 'EDIT001', text: 'Built test dashboards that surface vendor SLA exceptions by bureau.' },
      ],
    },
    {
      name: 'Demo AI Help Desk Assistant',
      description: `${DEMO_TAG} High-visibility AI effort currently off track while controls are tightened.`,
      programName: 'Demo AI Enablement Program',
      applicationName: 'Demo Service Desk Copilot',
      staffingProjectName: 'Demo AI Help Desk Assistant',
      productNames: ['Platform Enhancements & Support'],
      departmentName: 'IRS',
      priorityName: '1 - Critical',
      executionTypeName: 'SAFe',
      customerCategoryName: 'Internal',
      phaseName: 'Planning',
      status: 'red' as const,
      plannedStartDate: withMonthOffset(today, -5),
      plannedEndDate: withMonthOffset(today, 5),
      actualStartDate: withMonthOffset(today, -4),
      actualEndDate: null,
      funded: true,
      updateCadence: 'biweekly' as const,
      nextUpdateDue: withDayOffset(today, -12),
      federalProductOwner: 'Janelle Price',
      customerContact: 'Resource Manager',
      roadmap: [
        { name: 'Guardrail design', startDate: withMonthOffset(today, -5), endDate: withMonthOffset(today, -3), color: '#3d4551' },
        { name: 'Knowledge base tuning', startDate: withMonthOffset(today, -3), endDate: withMonthOffset(today, 1), color: '#5c1a1a' },
        { name: 'Controlled beta', startDate: withMonthOffset(today, 1), endDate: withMonthOffset(today, 3), color: '#8b4513' },
        { name: 'Broader rollout', startDate: withMonthOffset(today, 3), endDate: withMonthOffset(today, 5), color: '#1b4332' },
      ],
      updates: [
        { createdAt: withDayOffset(today, -130), authorCaiaId: 'ADMIN001', overallStatus: 'initiated' as const, summary: 'Initial use cases prioritized around deflection of common help desk requests.', risks: 'Need clear escalation path for unsupported answers.', blockers: null },
        { createdAt: withDayOffset(today, -70), authorCaiaId: 'EDIT001', overallStatus: 'yellow' as const, summary: 'Prototype answers were strong, but citation quality and response controls need more work.', risks: 'Users may trust unsupported responses too quickly.', blockers: 'Security review requested prompt logging changes.' },
        { createdAt: withDayOffset(today, -2), authorCaiaId: 'ADMIN001', overallStatus: 'red' as const, summary: 'This week the team finalized a narrowed pilot corpus and resumed governance review with security and knowledge owners.', risks: 'Schedule pressure remains high if governance sign-off slips again.', blockers: 'Awaiting approval for the production source publication workflow.' },
        { createdAt: withDayOffset(today, -32), authorCaiaId: 'ADMIN001', overallStatus: 'red' as const, summary: 'Pilot paused until source freshness checks and approval workflow are complete.', risks: 'Timeline will slip if governance tooling is not approved this month.', blockers: 'Need approved workflow for publishing knowledge sources to the assistant.' },
      ],
      issues: [
        { createdAt: withDayOffset(today, -34), authorCaiaId: 'ADMIN001', category: 'blocker' as const, text: 'Knowledge source approval workflow is not finalized.', resolvedAt: null, resolvedByCaiaId: null, resolutionNotes: null },
        { createdAt: withDayOffset(today, -71), authorCaiaId: 'EDIT001', category: 'issue' as const, text: 'Some prototype responses cited out-of-date runbooks.', resolvedAt: withDayOffset(today, -55), resolvedByCaiaId: 'ADMIN001', resolutionNotes: 'Restricted the pilot corpus and added freshness checks.' },
      ],
      accomplishments: [
        { createdAt: withDayOffset(today, -122), authorCaiaId: 'ADMIN001', text: 'Validated the top 20 recurring service desk intents with operations leadership.' },
        { createdAt: withDayOffset(today, -60), authorCaiaId: 'EDIT001', text: 'Implemented citation rendering for internal knowledge responses.' },
      ],
    },
    {
      name: 'Demo Records Automation Rollout',
      description: `${DEMO_TAG} Newly initiated workflow automation effort with forward-looking roadmap milestones.`,
      programName: 'Demo Intake Transformation Program',
      applicationName: 'Demo Review Workbench',
      staffingProjectName: 'Demo Records Automation Rollout',
      productNames: ['Content Management', 'Architecture & Integration'],
      departmentName: 'Mint',
      priorityName: '4 - Low',
      executionTypeName: 'Waterfall',
      customerCategoryName: 'Internal',
      phaseName: 'Discovery',
      status: 'initiated' as const,
      plannedStartDate: withMonthOffset(today, -1),
      plannedEndDate: withMonthOffset(today, 7),
      actualStartDate: withMonthOffset(today, -1),
      actualEndDate: null,
      funded: false,
      updateCadence: 'monthly' as const,
      nextUpdateDue: withDayOffset(today, 10),
      federalProductOwner: 'Sophia Nguyen',
      customerContact: 'Alice Customer',
      roadmap: [
        { name: 'Current-state process map', startDate: withMonthOffset(today, -1), endDate: withMonthOffset(today, 1), color: '#1a3a5c' },
        { name: 'Requirements and controls', startDate: withMonthOffset(today, 1), endDate: withMonthOffset(today, 3), color: '#005ea2' },
        { name: 'Build and validation', startDate: withMonthOffset(today, 3), endDate: withMonthOffset(today, 5), color: '#3d4551' },
        { name: 'Training and adoption', startDate: withMonthOffset(today, 5), endDate: withMonthOffset(today, 7), color: '#1b4332' },
      ],
      updates: [
        { createdAt: withDayOffset(today, -1), authorCaiaId: 'EDIT001', overallStatus: 'initiated' as const, summary: 'Interview notes from the first discovery sessions were consolidated this week and a draft requirements outline is in review.', risks: 'Funding approval is still pending for implementation support.', blockers: null },
        { createdAt: withDayOffset(today, -12), authorCaiaId: 'EDIT001', overallStatus: 'initiated' as const, summary: 'Kickoff complete and current-state interviews scheduled.', risks: 'Funding approval is still pending for implementation support.', blockers: null },
      ],
      issues: [
        { createdAt: withDayOffset(today, -9), authorCaiaId: 'EDIT001', category: 'risk' as const, text: 'Implementation funding not yet approved for phase-two build support.', resolvedAt: null, resolvedByCaiaId: null, resolutionNotes: null },
      ],
      accomplishments: [
        { createdAt: withDayOffset(today, -5), authorCaiaId: 'EDIT001', text: 'Confirmed records stakeholders and published the discovery interview schedule.' },
      ],
    },
    {
      name: 'Demo Grants Analytics Pilot',
      description: `${DEMO_TAG} Completed pilot with no current status activity and historical roadmap data.`,
      programName: 'Demo Analytics Acceleration Program',
      applicationName: 'Demo Grants Insight Hub',
      staffingProjectName: 'Demo Grants Analytics Pilot',
      productNames: ['DCFO', 'OneFM'],
      departmentName: 'CDFI',
      priorityName: '3 - Medium',
      executionTypeName: 'Agile',
      customerCategoryName: 'Bureaus',
      phaseName: 'Sustainment',
      status: 'gray' as const,
      plannedStartDate: withMonthOffset(today, -12),
      plannedEndDate: withMonthOffset(today, -1),
      actualStartDate: withMonthOffset(today, -12),
      actualEndDate: withMonthOffset(today, -1),
      funded: true,
      updateCadence: 'monthly' as const,
      nextUpdateDue: null,
      federalProductOwner: 'Priya Raman',
      customerContact: 'Bob Customer',
      roadmap: [
        { name: 'Pilot design', startDate: withMonthOffset(today, -12), endDate: withMonthOffset(today, -10), color: '#005ea2' },
        { name: 'Dashboard build', startDate: withMonthOffset(today, -10), endDate: withMonthOffset(today, -6), color: '#1b4332' },
        { name: 'User testing', startDate: withMonthOffset(today, -6), endDate: withMonthOffset(today, -3), color: '#7b3f00' },
        { name: 'Closeout', startDate: withMonthOffset(today, -3), endDate: withMonthOffset(today, -1), color: '#3d4551' },
      ],
      updates: [
        { createdAt: withDayOffset(today, -310), authorCaiaId: 'ADMIN001', overallStatus: 'green' as const, summary: 'Pilot dashboards loaded cleanly and leadership approved the metric set.', risks: null, blockers: null },
        { createdAt: withDayOffset(today, -180), authorCaiaId: 'EDIT001', overallStatus: 'green' as const, summary: 'Training complete and pilot users adopted the shared metric definitions.', risks: 'Need a sustainment owner after pilot closeout.', blockers: null },
        { createdAt: withDayOffset(today, -5), authorCaiaId: 'ADMIN001', overallStatus: 'gray' as const, summary: 'This week the team packaged final pilot outcomes and handed off sustainment recommendations for leadership review.', risks: null, blockers: null },
        { createdAt: withDayOffset(today, -40), authorCaiaId: 'ADMIN001', overallStatus: 'gray' as const, summary: 'Pilot closed successfully and the team is evaluating long-term ownership.', risks: null, blockers: null },
      ],
      issues: [
        { createdAt: withDayOffset(today, -200), authorCaiaId: 'EDIT001', category: 'issue' as const, text: 'One source feed missed historical backfill records for two weeks.', resolvedAt: withDayOffset(today, -185), resolvedByCaiaId: 'ADMIN001', resolutionNotes: 'Completed a one-time historical reload and added validation checks.' },
      ],
      accomplishments: [
        { createdAt: withDayOffset(today, -250), authorCaiaId: 'ADMIN001', text: 'Published a pilot scorecard used in monthly program reviews.' },
        { createdAt: withDayOffset(today, -35), authorCaiaId: 'ADMIN001', text: 'Completed pilot closeout package with measured reporting time savings.' },
      ],
    },
  ];

  for (const config of statusConfigs) {
    const statusProject = await ensureStatusProject({
      name: config.name,
      description: config.description,
      programId: refs.programs[config.programName],
      staffingProjectId: projectsByName[config.staffingProjectName]?.id ?? null,
      federalProductOwner: config.federalProductOwner,
      customerContact: config.customerContact,
      departmentId: refs.departments[config.departmentName],
      priorityId: refs.priorities[config.priorityName],
      executionTypeId: refs.executionTypes[config.executionTypeName],
      customerCategoryId: refs.customerCategories[config.customerCategoryName],
      phaseId: refs.statusPhases[config.phaseName],
      status: config.status,
      plannedStartDate: config.plannedStartDate,
      plannedEndDate: config.plannedEndDate,
      actualStartDate: config.actualStartDate,
      actualEndDate: config.actualEndDate,
      funded: config.funded,
      updateCadence: config.updateCadence,
      nextUpdateDue: config.nextUpdateDue,
    });

    await prisma.productStatusProject.deleteMany({ where: { statusProjectId: statusProject.id } });
    await prisma.productStatusProject.createMany({
      data: config.productNames.map((productName) => ({
        statusProjectId: statusProject.id,
        productId: refs.products[productName],
      })),
      skipDuplicates: true,
    });

    await prisma.projectPhase.deleteMany({ where: { statusProjectId: statusProject.id } });
    await prisma.projectPhase.createMany({
      data: config.roadmap.map((phase, index) => ({
        statusProjectId: statusProject.id,
        name: phase.name,
        startDate: phase.startDate,
        endDate: phase.endDate,
        color: phase.color,
        sortOrder: index,
      })),
    });

    await prisma.statusUpdate.deleteMany({ where: { statusProjectId: statusProject.id } });
    await prisma.statusUpdate.createMany({
      data: config.updates.map((update) => ({
        statusProjectId: statusProject.id,
        authorId: refs.users[update.authorCaiaId],
        overallStatus: update.overallStatus,
        summary: update.summary,
        risks: update.risks,
        blockers: update.blockers,
        createdAt: update.createdAt,
      })),
    });

    await prisma.issueEntry.deleteMany({ where: { statusProjectId: statusProject.id } });
    await prisma.issueEntry.createMany({
      data: config.issues.map((issue) => ({
        statusProjectId: statusProject.id,
        authorId: refs.users[issue.authorCaiaId],
        category: issue.category,
        text: issue.text,
        createdAt: issue.createdAt,
        resolvedAt: issue.resolvedAt,
        resolvedById: issue.resolvedByCaiaId ? refs.users[issue.resolvedByCaiaId] : null,
        resolutionNotes: issue.resolutionNotes,
      })),
    });

    await prisma.accomplishment.deleteMany({ where: { statusProjectId: statusProject.id } });
    await prisma.accomplishment.createMany({
      data: config.accomplishments.map((item) => ({
        statusProjectId: statusProject.id,
        authorId: refs.users[item.authorCaiaId],
        text: item.text,
        createdAt: item.createdAt,
      })),
    });
  }
}

async function seedResourcesAndAssignments(refs: RefMaps) {
  const today = new Date();
  const resourceConfigs = [
    {
      caiaId: 'DEMOR001',
      firstName: 'Olivia',
      lastName: 'Stone',
      resourceType: 'federal' as const,
      division: 'pmso' as const,
      functionalAreaName: 'Program Operations',
      primaryRoleName: 'Program Manager',
      secondaryRoleName: 'Supervisor',
      isSupervisor: true,
      opsEngLead: 'Treasury PMSO',
      gsLevel: 'GS-15',
      isMatrixed: false,
      availableForWork: false,
      notes: `${DEMO_TAG} Program lead overseeing the intake and records initiatives.`,
    },
    {
      caiaId: 'DEMOR002',
      firstName: 'Marcus',
      lastName: 'Hale',
      resourceType: 'federal' as const,
      division: 'operations' as const,
      functionalAreaName: 'Platform Operations',
      primaryRoleName: 'Operations Management',
      secondaryRoleName: 'Supervisor',
      isSupervisor: true,
      opsEngLead: 'Operations Council',
      gsLevel: 'GS-14',
      isMatrixed: true,
      availableForWork: false,
      notes: `${DEMO_TAG} Operations lead for vendor and support workflows.`,
    },
    {
      caiaId: 'DEMOR003',
      firstName: 'Janelle',
      lastName: 'Price',
      resourceType: 'federal' as const,
      division: 'engineering' as const,
      functionalAreaName: 'AI & Enterprise Developer Tools',
      primaryRoleName: 'Architect',
      secondaryRoleName: 'Engineer',
      supervisorCaiaId: 'DEMOR001',
      secondLineSupervisorCaiaId: 'DEMOR002',
      gsLevel: 'GS-14',
      isMatrixed: true,
      availableForWork: false,
      notes: `${DEMO_TAG} Technical lead for AI and platform architecture.`,
    },
    {
      caiaId: 'DEMOR004',
      firstName: 'Ethan',
      lastName: 'Cole',
      resourceType: 'contractor' as const,
      division: 'engineering' as const,
      functionalAreaName: 'Back Office Software',
      primaryRoleName: 'Developer',
      secondaryRoleName: 'Engineer',
      supervisorCaiaId: 'DEMOR003',
      secondLineSupervisorCaiaId: 'DEMOR001',
      popStartDate: withMonthOffset(today, -7),
      popEndDate: withDayOffset(today, 45),
      popAlertDaysBefore: 30,
      availableForWork: false,
      notes: `${DEMO_TAG} Full-stack engineer supporting intake and AI initiatives.`,
    },
    {
      caiaId: 'DEMOR005',
      firstName: 'Priya',
      lastName: 'Raman',
      resourceType: 'federal' as const,
      division: 'engineering' as const,
      functionalAreaName: 'Financial Management',
      primaryRoleName: 'Data Analyst',
      secondaryRoleName: 'Business Analyst',
      supervisorCaiaId: 'DEMOR001',
      secondLineSupervisorCaiaId: 'DEMOR002',
      gsLevel: 'GS-13',
      isMatrixed: true,
      availableForWork: false,
      notes: `${DEMO_TAG} Analytics lead covering dashboards and pilot reporting.`,
    },
    {
      caiaId: 'DEMOR006',
      firstName: 'Noah',
      lastName: 'Bennett',
      resourceType: 'contractor' as const,
      division: 'engineering' as const,
      functionalAreaName: 'Digital Design and Experience',
      primaryRoleName: 'Designer',
      secondaryRoleName: 'User Interface/User Experience',
      supervisorCaiaId: 'DEMOR003',
      secondLineSupervisorCaiaId: 'DEMOR001',
      popStartDate: withMonthOffset(today, -4),
      popEndDate: withMonthOffset(today, 8),
      popAlertDaysBefore: 45,
      availableForWork: true,
      notes: `${DEMO_TAG} Product designer available for additional user research work.`,
    },
    {
      caiaId: 'DEMOR007',
      firstName: 'Sophia',
      lastName: 'Nguyen',
      resourceType: 'federal' as const,
      division: 'pmso' as const,
      functionalAreaName: 'Project Management',
      primaryRoleName: 'Project Manager',
      secondaryRoleName: 'Senior Project Manager',
      supervisorCaiaId: 'DEMOR001',
      secondLineSupervisorCaiaId: 'DEMOR002',
      gsLevel: 'GS-13',
      isMatrixed: false,
      availableForWork: false,
      notes: `${DEMO_TAG} Delivery lead balancing roadmap execution and customer communications.`,
    },
    {
      caiaId: 'DEMOR008',
      firstName: 'Carlos',
      lastName: 'Reyes',
      resourceType: 'contractor' as const,
      division: 'operations' as const,
      functionalAreaName: 'Communications',
      primaryRoleName: 'Technical Writer',
      secondaryRoleName: 'Communications',
      supervisorCaiaId: 'DEMOR002',
      secondLineSupervisorCaiaId: 'DEMOR001',
      popStartDate: withMonthOffset(today, -10),
      popEndDate: withDayOffset(today, 18),
      popAlertDaysBefore: 14,
      availableForWork: true,
      notes: `${DEMO_TAG} Documentation lead with an upcoming PoP end date for alert testing.`,
    },
    {
      caiaId: 'DEMOR009',
      firstName: 'Maya',
      lastName: 'Patel',
      resourceType: 'federal' as const,
      division: 'operations' as const,
      functionalAreaName: 'Cybersecurity Applications',
      primaryRoleName: 'Engineer - Cybersecurity',
      secondaryRoleName: 'System Admin',
      supervisorCaiaId: 'DEMOR002',
      secondLineSupervisorCaiaId: 'DEMOR001',
      gsLevel: 'GS-12',
      isMatrixed: true,
      availableForWork: false,
      notes: `${DEMO_TAG} Security engineering partner for operational controls and approvals.`,
    },
    {
      caiaId: 'DEMOR010',
      firstName: 'Liam',
      lastName: 'Turner',
      resourceType: 'contractor' as const,
      division: 'pmso' as const,
      functionalAreaName: 'Resource Management',
      primaryRoleName: 'Business Analyst',
      secondaryRoleName: 'Project Manager',
      supervisorCaiaId: 'DEMOR007',
      secondLineSupervisorCaiaId: 'DEMOR001',
      popStartDate: withMonthOffset(today, -6),
      popEndDate: withMonthOffset(today, 3),
      popAlertDaysBefore: 21,
      availableForWork: false,
      notes: `${DEMO_TAG} BA supporting intake metrics, backlog triage, and coordination.`,
    },
    {
      caiaId: 'DEMOR011',
      firstName: 'Zoe',
      lastName: 'Mitchell',
      resourceType: 'federal' as const,
      division: 'engineering' as const,
      functionalAreaName: 'Platform Operations',
      primaryRoleName: 'Quality Assurance/Tester',
      secondaryRoleName: 'Release Management',
      supervisorCaiaId: 'DEMOR003',
      secondLineSupervisorCaiaId: 'DEMOR001',
      gsLevel: 'GS-12',
      isMatrixed: true,
      availableForWork: true,
      notes: `${DEMO_TAG} Test lead with spare capacity for cross-project validation.`,
    },
    {
      caiaId: 'DEMOR012',
      firstName: 'Henry',
      lastName: 'Ward',
      resourceType: 'contractor' as const,
      division: 'engineering' as const,
      functionalAreaName: 'Project Management Tools',
      primaryRoleName: 'Developer',
      secondaryRoleName: 'Data Analyst',
      supervisorCaiaId: 'DEMOR003',
      secondLineSupervisorCaiaId: 'DEMOR001',
      popStartDate: withMonthOffset(today, -9),
      popEndDate: withMonthOffset(today, 6),
      popAlertDaysBefore: 30,
      availableForWork: false,
      notes: `${DEMO_TAG} Builder for dashboards, reporting pipelines, and admin tooling.`,
    },
  ];

  const resourcesByCaiaId: Record<string, { id: string }> = {};
  for (const config of resourceConfigs) {
    const resource = await prisma.resource.upsert({
      where: { userId: refs.users[config.caiaId] },
      update: {
        resourceType: config.resourceType,
        firstName: config.firstName,
        lastName: config.lastName,
        division: config.division,
        functionalAreaId: refs.functionalAreas[config.functionalAreaName],
        primaryRoleId: refs.roles[config.primaryRoleName],
        secondaryRoleId: config.secondaryRoleName ? refs.roles[config.secondaryRoleName] : null,
        isSupervisor: config.isSupervisor ?? false,
        opsEngLead: config.opsEngLead ?? null,
        supervisorId: config.supervisorCaiaId ? resourcesByCaiaId[config.supervisorCaiaId]?.id ?? null : null,
        secondLineSupervisorId: config.secondLineSupervisorCaiaId ? resourcesByCaiaId[config.secondLineSupervisorCaiaId]?.id ?? null : null,
        gsLevel: config.gsLevel ?? null,
        isMatrixed: config.isMatrixed ?? null,
        popStartDate: config.popStartDate ?? null,
        popEndDate: config.popEndDate ?? null,
        popAlertDaysBefore: config.popAlertDaysBefore ?? null,
        availableForWork: config.availableForWork,
        notes: config.notes,
        isActive: true,
      },
      create: {
        userId: refs.users[config.caiaId],
        resourceType: config.resourceType,
        firstName: config.firstName,
        lastName: config.lastName,
        division: config.division,
        functionalAreaId: refs.functionalAreas[config.functionalAreaName],
        primaryRoleId: refs.roles[config.primaryRoleName],
        secondaryRoleId: config.secondaryRoleName ? refs.roles[config.secondaryRoleName] : null,
        isSupervisor: config.isSupervisor ?? false,
        opsEngLead: config.opsEngLead ?? null,
        supervisorId: config.supervisorCaiaId ? resourcesByCaiaId[config.supervisorCaiaId]?.id ?? null : null,
        secondLineSupervisorId: config.secondLineSupervisorCaiaId ? resourcesByCaiaId[config.secondLineSupervisorCaiaId]?.id ?? null : null,
        gsLevel: config.gsLevel ?? null,
        isMatrixed: config.isMatrixed ?? null,
        popStartDate: config.popStartDate ?? null,
        popEndDate: config.popEndDate ?? null,
        popAlertDaysBefore: config.popAlertDaysBefore ?? null,
        availableForWork: config.availableForWork,
        notes: config.notes,
        isActive: true,
      },
    });
    resourcesByCaiaId[config.caiaId] = { id: resource.id };
  }

  const demoProjects = await prisma.project.findMany({
    where: { description: { contains: DEMO_TAG } },
    select: { id: true, name: true },
  });
  const projectIdsByName = Object.fromEntries(demoProjects.map((project) => [project.name, project.id]));

  await prisma.assignment.deleteMany({
    where: {
      OR: [
        { projectId: { in: demoProjects.map((project) => project.id) } },
        { resourceId: { in: Object.values(resourcesByCaiaId).map((resource) => resource.id) } },
      ],
    },
  });

  const assignments = [
    { resourceCaiaId: 'DEMOR001', projectName: 'Demo Treasury Intake Modernization', roleName: 'Program Manager', percentUtilized: 0.35, startDate: withMonthOffset(today, -10), endDate: withMonthOffset(today, 4), notes: `${DEMO_TAG} Executive sponsor coverage.` },
    { resourceCaiaId: 'DEMOR003', projectName: 'Demo Treasury Intake Modernization', roleName: 'Architect', percentUtilized: 0.5, startDate: withMonthOffset(today, -9), endDate: withMonthOffset(today, 4), notes: `${DEMO_TAG} Architecture and integration support.` },
    { resourceCaiaId: 'DEMOR004', projectName: 'Demo Treasury Intake Modernization', roleName: 'Developer', percentUtilized: 0.65, startDate: withMonthOffset(today, -8), endDate: withMonthOffset(today, 2), notes: `${DEMO_TAG} Workflow implementation.` },
    { resourceCaiaId: 'DEMOR006', projectName: 'Demo Treasury Intake Modernization', roleName: 'Designer', percentUtilized: 0.2, startDate: withMonthOffset(today, -6), endDate: withMonthOffset(today, 1), notes: `${DEMO_TAG} Pilot UX refinement.` },
    { resourceCaiaId: 'DEMOR007', projectName: 'Demo Treasury Intake Modernization', roleName: 'Project Manager', percentUtilized: 0.55, startDate: withMonthOffset(today, -9), endDate: withMonthOffset(today, 4), notes: `${DEMO_TAG} Delivery management.` },
    { resourceCaiaId: 'DEMOR010', projectName: 'Demo Treasury Intake Modernization', roleName: 'Business Analyst', percentUtilized: 0.5, startDate: withMonthOffset(today, -8), endDate: withMonthOffset(today, 3), notes: `${DEMO_TAG} Intake requirements and metrics.` },
    { resourceCaiaId: 'DEMOR002', projectName: 'Demo Vendor Oversight Portal', roleName: 'Operations Management', percentUtilized: 0.4, startDate: withMonthOffset(today, -8), endDate: withMonthOffset(today, 3), notes: `${DEMO_TAG} Operational sponsor.` },
    { resourceCaiaId: 'DEMOR008', projectName: 'Demo Vendor Oversight Portal', roleName: 'Technical Writer', percentUtilized: 0.35, startDate: withMonthOffset(today, -5), endDate: withMonthOffset(today, 1), notes: `${DEMO_TAG} Launch communications.` },
    { resourceCaiaId: 'DEMOR009', projectName: 'Demo Vendor Oversight Portal', roleName: 'Engineer - Cybersecurity', percentUtilized: 0.25, startDate: withMonthOffset(today, -3), endDate: withMonthOffset(today, 2), notes: `${DEMO_TAG} Security review and controls.` },
    { resourceCaiaId: 'DEMOR003', projectName: 'Demo AI Help Desk Assistant', roleName: 'Architect', percentUtilized: 0.4, startDate: withMonthOffset(today, -5), endDate: withMonthOffset(today, 5), notes: `${DEMO_TAG} AI platform architecture.` },
    { resourceCaiaId: 'DEMOR004', projectName: 'Demo AI Help Desk Assistant', roleName: 'Developer', percentUtilized: 0.45, startDate: withMonthOffset(today, -4), endDate: withMonthOffset(today, 5), notes: `${DEMO_TAG} Prototype implementation.` },
    { resourceCaiaId: 'DEMOR009', projectName: 'Demo AI Help Desk Assistant', roleName: 'Engineer - Cybersecurity', percentUtilized: 0.5, startDate: withMonthOffset(today, -3), endDate: withMonthOffset(today, 4), notes: `${DEMO_TAG} Safety and controls.` },
    { resourceCaiaId: 'DEMOR011', projectName: 'Demo AI Help Desk Assistant', roleName: 'Quality Assurance/Tester', percentUtilized: 0.3, startDate: withMonthOffset(today, -2), endDate: withMonthOffset(today, 4), notes: `${DEMO_TAG} Citation and answer validation.` },
    { resourceCaiaId: 'DEMOR007', projectName: 'Demo Records Automation Rollout', roleName: 'Project Manager', percentUtilized: 0.25, startDate: withMonthOffset(today, -1), endDate: withMonthOffset(today, 7), notes: `${DEMO_TAG} Early planning support.` },
    { resourceCaiaId: 'DEMOR010', projectName: 'Demo Records Automation Rollout', roleName: 'Business Analyst', percentUtilized: 0.35, startDate: withMonthOffset(today, -1), endDate: withMonthOffset(today, 5), notes: `${DEMO_TAG} Requirements and process mapping.` },
    { resourceCaiaId: 'DEMOR005', projectName: 'Demo Grants Analytics Pilot', roleName: 'Data Analyst', percentUtilized: 0.6, startDate: withMonthOffset(today, -11), endDate: withMonthOffset(today, -1), notes: `${DEMO_TAG} Metrics model and dashboard delivery.` },
    { resourceCaiaId: 'DEMOR012', projectName: 'Demo Grants Analytics Pilot', roleName: 'Developer', percentUtilized: 0.45, startDate: withMonthOffset(today, -10), endDate: withMonthOffset(today, -1), notes: `${DEMO_TAG} Reporting pipelines and dashboard implementation.` },
    { resourceCaiaId: 'DEMOR005', projectName: 'Demo Executive Reporting Refresh', roleName: 'Data Analyst', percentUtilized: 0.25, startDate: withMonthOffset(today, -10), endDate: withMonthOffset(today, -2), notes: `${DEMO_TAG} Historical reporting cleanup.` },
    { resourceCaiaId: 'DEMOR012', projectName: 'Demo Executive Reporting Refresh', roleName: 'Developer', percentUtilized: 0.35, startDate: withMonthOffset(today, -9), endDate: withMonthOffset(today, -2), notes: `${DEMO_TAG} Dashboard and export refresh.` },
  ];

  for (const assignment of assignments) {
    await prisma.assignment.create({
      data: {
        resourceId: resourcesByCaiaId[assignment.resourceCaiaId].id,
        projectId: projectIdsByName[assignment.projectName],
        roleId: refs.roles[assignment.roleName],
        percentUtilized: assignment.percentUtilized,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        notes: assignment.notes,
        isActive: true,
      },
    });
  }
}

async function seedIntake(refs: RefMaps) {
  const today = new Date();
  const approvedLinkedProject = await prisma.statusProject.findFirst({
    where: { name: 'Demo Treasury Intake Modernization' },
    select: { id: true, name: true },
  });

  const submissionConfigs = [
    {
      title: 'Demo Intake Draft - Records Routing Cleanup',
      submitterCaiaId: 'CUST001',
      status: 'draft' as const,
      createdAt: withDayOffset(today, -22),
      aiScore: null,
      aiScoreDetails: null,
      aiScoredAt: null,
      determination: null,
      determinationNotes: null,
      denialReason: null,
      determinedByCaiaId: null,
      determinedAt: null,
      linkedProjectId: null,
      versions: [
        {
          versionNumber: 1,
          createdAt: withDayOffset(today, -22),
          createdByCaiaId: 'CUST001',
          formData: {
            problemStatement: 'Records coordinators still hand-route submissions through email and spreadsheets.',
            businessGoals: 'Reduce manual touchpoints and improve routing consistency.',
            costSavings: 'Expected savings of 10 analyst hours per month.',
            desiredTimeline: 'Q3 FY26',
            stakeholders: 'Records office, intake analysts, bureau coordinators',
            technicalRequirements: 'Routing rules, queue assignment, dashboard visibility',
            proposedSolution: 'Enhance the shared intake workflow with records-specific logic.',
            priority: 'medium',
          },
        },
      ],
    },
    {
      title: 'Demo Intake Submitted - Vendor SLA Dashboard',
      submitterCaiaId: 'CUST002',
      status: 'submitted' as const,
      createdAt: withDayOffset(today, -95),
      aiScore: 78,
      aiScoreDetails: { score: 78, summary: 'Strong operational value with moderate dependency risk.' },
      aiScoredAt: withDayOffset(today, -94),
      determination: null,
      determinationNotes: null,
      denialReason: null,
      determinedByCaiaId: null,
      determinedAt: null,
      linkedProjectId: null,
      versions: [
        {
          versionNumber: 1,
          createdAt: withDayOffset(today, -95),
          createdByCaiaId: 'CUST002',
          formData: {
            problemStatement: 'Vendor SLA performance is tracked manually across bureaus.',
            businessGoals: 'Create a single dashboard for escalations and missed deadlines.',
            costSavings: 'Reduce reporting prep from 2 days to 3 hours monthly.',
            desiredTimeline: 'Within 12 weeks',
            stakeholders: 'Acquisition leads, vendor managers, bureau operations',
            technicalRequirements: 'Automated ingest, dashboard filters, exportable scorecards',
            proposedSolution: 'Build a cross-bureau SLA dashboard with trend alerts.',
            priority: 'high',
          },
        },
      ],
    },
    {
      title: 'Demo Intake Under Review - AI Knowledge Search',
      submitterCaiaId: 'CUST001',
      status: 'under_review' as const,
      createdAt: withDayOffset(today, -140),
      aiScore: 84,
      aiScoreDetails: { score: 84, summary: 'Promising use case with clear productivity benefits.' },
      aiScoredAt: withDayOffset(today, -138),
      determination: null,
      determinationNotes: null,
      denialReason: null,
      determinedByCaiaId: null,
      determinedAt: null,
      linkedProjectId: null,
      versions: [
        {
          versionNumber: 1,
          createdAt: withDayOffset(today, -140),
          createdByCaiaId: 'CUST001',
          formData: {
            problemStatement: 'Staff cannot quickly locate current SOPs and runbooks.',
            businessGoals: 'Improve knowledge discovery and reduce repeated tickets.',
            costSavings: 'Expected productivity gain of 15-20%.',
            desiredTimeline: '6 months',
            stakeholders: 'Service desk, operations, engineering leads',
            technicalRequirements: 'Search relevance, access controls, citation support',
            proposedSolution: 'Deploy an AI-assisted search layer over approved documentation.',
            priority: 'high',
          },
        },
        {
          versionNumber: 2,
          createdAt: withDayOffset(today, -133),
          createdByCaiaId: 'CUST001',
          formData: {
            problemStatement: 'Staff cannot quickly locate current SOPs and runbooks across teams.',
            businessGoals: 'Improve knowledge discovery, reduce duplicate tickets, and speed onboarding.',
            costSavings: 'Expected productivity gain of 15-20% plus fewer escalations.',
            desiredTimeline: '6 months',
            stakeholders: 'Service desk, operations, engineering leads, knowledge owners',
            technicalRequirements: 'Search relevance, access controls, citation support, freshness checks',
            proposedSolution: 'Deploy an AI-assisted search layer over approved documentation with citations.',
            priority: 'high',
          },
        },
      ],
    },
    {
      title: 'Demo Intake Backlog - Consolidated Meeting Notes',
      submitterCaiaId: 'CUST002',
      status: 'backlog' as const,
      createdAt: withDayOffset(today, -260),
      aiScore: 61,
      aiScoreDetails: { score: 61, summary: 'Useful idea, but lower urgency than current priorities.' },
      aiScoredAt: withDayOffset(today, -259),
      determination: 'backlog' as const,
      determinationNotes: 'Worth revisiting after current intake and AI priorities stabilize.',
      denialReason: null,
      determinedByCaiaId: 'REVIEW01',
      determinedAt: withDayOffset(today, -240),
      linkedProjectId: null,
      versions: [
        {
          versionNumber: 1,
          createdAt: withDayOffset(today, -260),
          createdByCaiaId: 'CUST002',
          formData: {
            problemStatement: 'Meeting notes are scattered and hard to search after decisions are made.',
            businessGoals: 'Centralize notes and action items for easier follow-up.',
            costSavings: 'Soft savings through easier retrieval and less duplication.',
            desiredTimeline: 'When capacity is available',
            stakeholders: 'Program leads, analysts, project managers',
            technicalRequirements: 'Searchable notes, tagging, basic exports',
            proposedSolution: 'Create a shared note capture and archive pattern.',
            priority: 'low',
          },
        },
      ],
    },
    {
      title: 'Demo Intake Denied - Custom Share Drive Clone',
      submitterCaiaId: 'CUST001',
      status: 'denied' as const,
      createdAt: withDayOffset(today, -330),
      aiScore: 39,
      aiScoreDetails: { score: 39, summary: 'Low strategic fit and overlaps with existing tooling.' },
      aiScoredAt: withDayOffset(today, -329),
      determination: 'denied' as const,
      determinationNotes: 'Existing enterprise tools already cover the requested workflow.',
      denialReason: 'Duplicative capability with approved enterprise storage and records tooling.',
      determinedByCaiaId: 'REVIEW01',
      determinedAt: withDayOffset(today, -312),
      linkedProjectId: null,
      versions: [
        {
          versionNumber: 1,
          createdAt: withDayOffset(today, -330),
          createdByCaiaId: 'CUST001',
          formData: {
            problemStatement: 'Teams want a dedicated file-sharing space with custom workflows.',
            businessGoals: 'Provide a more tailored storage experience.',
            costSavings: 'Unclear.',
            desiredTimeline: 'As soon as possible',
            stakeholders: 'Multiple offices',
            technicalRequirements: 'Shared storage, permissions, file versioning',
            proposedSolution: 'Build a custom file-sharing application.',
            priority: 'medium',
          },
        },
      ],
    },
    {
      title: 'Demo Intake Approved - Treasury Intake Modernization',
      submitterCaiaId: 'CUST002',
      status: 'approved' as const,
      createdAt: withDayOffset(today, -355),
      aiScore: 91,
      aiScoreDetails: { score: 91, summary: 'High-value modernization effort with clear leadership support.' },
      aiScoredAt: withDayOffset(today, -353),
      determination: 'approved' as const,
      determinationNotes: 'Approved for phased implementation with PMSO sponsorship.',
      denialReason: null,
      determinedByCaiaId: 'ADMIN001',
      determinedAt: withDayOffset(today, -340),
      linkedProjectId: approvedLinkedProject?.id ?? null,
      versions: [
        {
          versionNumber: 1,
          createdAt: withDayOffset(today, -355),
          createdByCaiaId: 'CUST002',
          formData: {
            problemStatement: 'Intake requests move through email, spreadsheets, and inconsistent routing rules.',
            businessGoals: 'Standardize intake, improve visibility, and cut review cycle time.',
            costSavings: 'Reduce manual effort by 25% and provide leadership reporting.',
            desiredTimeline: 'FY26 phased release',
            stakeholders: 'Bureaus, PMSO, intake reviewers, leadership',
            technicalRequirements: 'Routing rules, dashboards, approval history, audit support',
            proposedSolution: 'Build a shared intake portal and review workbench.',
            priority: 'critical',
          },
        },
        {
          versionNumber: 2,
          createdAt: withDayOffset(today, -348),
          createdByCaiaId: 'CUST002',
          formData: {
            problemStatement: 'Intake requests move through email, spreadsheets, and inconsistent routing rules across bureaus.',
            businessGoals: 'Standardize intake, improve visibility, cut review cycle time, and support leadership prioritization.',
            costSavings: 'Reduce manual effort by 25% and provide a reusable review dashboard.',
            desiredTimeline: 'FY26 phased release',
            stakeholders: 'Bureaus, PMSO, intake reviewers, leadership, analysts',
            technicalRequirements: 'Routing rules, dashboards, approval history, audit support, role-based access',
            proposedSolution: 'Build a shared intake portal and reviewer workbench with analytics.',
            priority: 'critical',
          },
        },
      ],
    },
  ];

  for (const config of submissionConfigs) {
    let submission = await prisma.intakeSubmission.findFirst({
      where: { title: config.title, submitterId: refs.users[config.submitterCaiaId] },
      select: { id: true },
    });

    if (submission) {
      await prisma.intakeSubmission.update({
        where: { id: submission.id },
        data: { currentVersionId: null },
      });
      await prisma.intakeDocument.deleteMany({ where: { submissionId: submission.id } });
      await prisma.intakeSubmissionVersion.deleteMany({ where: { submissionId: submission.id } });
      await prisma.intakeSubmission.update({
        where: { id: submission.id },
        data: {
          title: config.title,
          status: config.status,
          aiScore: config.aiScore,
          aiScoreDetails: jsonOrDbNull(config.aiScoreDetails),
          aiScoredAt: config.aiScoredAt,
          determination: config.determination,
          determinationNotes: config.determinationNotes,
          denialReason: config.denialReason,
          determinedById: config.determinedByCaiaId ? refs.users[config.determinedByCaiaId] : null,
          determinedAt: config.determinedAt,
          linkedProjectId: config.linkedProjectId,
          designReviewMd: `# ${config.title}\n\n${DEMO_TAG}\n\nThis seeded design review provides realistic placeholder content for UI testing.`,
          designReviewGeneratedAt: config.aiScoredAt,
          createdAt: config.createdAt,
        },
      });
    } else {
      submission = await prisma.intakeSubmission.create({
        data: {
          submitterId: refs.users[config.submitterCaiaId],
          title: config.title,
          status: config.status,
          aiScore: config.aiScore,
          aiScoreDetails: jsonOrDbNull(config.aiScoreDetails),
          aiScoredAt: config.aiScoredAt,
          determination: config.determination,
          determinationNotes: config.determinationNotes,
          denialReason: config.denialReason,
          determinedById: config.determinedByCaiaId ? refs.users[config.determinedByCaiaId] : null,
          determinedAt: config.determinedAt,
          linkedProjectId: config.linkedProjectId,
          designReviewMd: `# ${config.title}\n\n${DEMO_TAG}\n\nThis seeded design review provides realistic placeholder content for UI testing.`,
          designReviewGeneratedAt: config.aiScoredAt,
          createdAt: config.createdAt,
        },
        select: { id: true },
      });
    }

    let currentVersionId: string | null = null;
    for (const version of config.versions) {
      const created = await prisma.intakeSubmissionVersion.create({
        data: {
          submissionId: submission.id,
          versionNumber: version.versionNumber,
          formData: version.formData,
          createdAt: version.createdAt,
          createdById: refs.users[version.createdByCaiaId],
        },
        select: { id: true },
      });
      currentVersionId = created.id;
    }

    await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: { currentVersionId },
    });
  }
}

async function seedRisksAndIssues(refs: RefMaps) {
  const today = new Date();

  // Look up status projects by name
  const statusProjects = await prisma.statusProject.findMany({
    select: { id: true, name: true, programId: true },
  });
  const sp = Object.fromEntries(statusProjects.map((p) => [p.name, { id: p.id, programId: p.programId }]));

  const riskCategories = await prisma.riskCategory.findMany({ select: { id: true, name: true } });
  const cat = Object.fromEntries(riskCategories.map((c) => [c.name, c.id]));

  const admin = refs.users['ADMIN001'];
  const editor = refs.users['EDIT001'];
  const reviewer = refs.users['REVIEW01'];

  type RiskSeed = {
    riskCode: string;
    projectName: string;
    categoryName: string;
    progress: 'open' | 'assumed' | 'mitigated' | 'escalated_to_issue';
    criticality: 'critical' | 'high' | 'moderate' | 'low';
    title: string;
    statement: string;
    impact?: string;
    closureCriteria?: string;
    spmId?: string;
    dateIdentified: Date;
    impactDate?: Date;
    escalatedAt?: Date;
    submitterKey: string;
    mitigationActions?: { title: string; dueDate?: Date; status: 'green' | 'yellow' | 'red'; isComplete: boolean }[];
  };

  const risks: RiskSeed[] = [
    // ── Demo Treasury Intake Modernization ──────────────────────────────────
    {
      riskCode: 'RISK-0001',
      projectName: 'Demo Treasury Intake Modernization',
      categoryName: 'Resources/Staffing',
      progress: 'open',
      criticality: 'high',
      title: 'Key analyst vacancies may delay pilot expansion',
      statement: 'Three senior analyst positions remain unfilled on the intake modernization team. If not filled before the pilot expansion phase, throughput will drop and review SLAs will not be met.',
      impact: 'Pilot expansion delayed by up to 6 weeks; increased backlog for intake reviewers.',
      closureCriteria: 'All three vacancies are filled and new hires have completed onboarding.',
      spmId: 'SPM-2201',
      dateIdentified: withDayOffset(today, -90),
      impactDate: withDayOffset(today, 45),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Submit requisitions for all three positions', dueDate: withDayOffset(today, -60), status: 'green', isComplete: true },
        { title: 'Identify interim contractor coverage', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Schedule hiring panel and interviews', dueDate: withDayOffset(today, 20), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0002',
      projectName: 'Demo Treasury Intake Modernization',
      categoryName: 'Schedule',
      progress: 'assumed',
      criticality: 'moderate',
      title: 'Bureau sign-off on routing rules may slip one sprint',
      statement: 'Two bureaus have not yet reviewed and approved the routing rule matrix required for the next release. Approval is on the critical path but bureaus have competing priorities.',
      impact: 'Next release delayed by one sprint (two weeks).',
      closureCriteria: 'Formal routing rule approval received from all participating bureaus.',
      dateIdentified: withDayOffset(today, -55),
      impactDate: withDayOffset(today, 14),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Send formal approval request to bureau leads', dueDate: withDayOffset(today, -40), status: 'green', isComplete: true },
        { title: 'Schedule 30-min review call if no response by deadline', dueDate: withDayOffset(today, 5), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0003',
      projectName: 'Demo Treasury Intake Modernization',
      categoryName: 'Technical Complexity',
      progress: 'mitigated',
      criticality: 'high',
      title: 'Legacy API incompatibility with new intake workflow engine',
      statement: 'The existing intake routing API uses a SOAP-based contract that is incompatible with the new event-driven workflow engine. An adapter layer must be built before integration testing can begin.',
      impact: 'Integration testing phase delayed; additional engineering effort of ~3 weeks.',
      closureCriteria: 'Adapter layer is deployed and integration test suite passes end-to-end.',
      spmId: 'SPM-2202',
      dateIdentified: withDayOffset(today, -130),
      impactDate: withDayOffset(today, -20),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Design adapter layer architecture', dueDate: withDayOffset(today, -110), status: 'green', isComplete: true },
        { title: 'Build and unit test adapter', dueDate: withDayOffset(today, -60), status: 'green', isComplete: true },
        { title: 'Run integration regression suite', dueDate: withDayOffset(today, -30), status: 'green', isComplete: true },
      ],
    },
    {
      riskCode: 'RISK-0004',
      projectName: 'Demo Treasury Intake Modernization',
      categoryName: 'Compliance',
      progress: 'open',
      criticality: 'critical',
      title: 'Privacy impact assessment not started for new intake data fields',
      statement: 'The new intake form captures additional PII fields that were not included in the original PIA. A revised PIA must be completed and approved by the Privacy Office before any data is collected in production.',
      impact: 'Production launch blocked until PIA is approved; potential regulatory exposure.',
      closureCriteria: 'Revised PIA submitted, reviewed, and approved by the Privacy Office.',
      spmId: 'SPM-2203',
      dateIdentified: withDayOffset(today, -30),
      impactDate: withDayOffset(today, 30),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Draft revised PIA with new data fields', dueDate: withDayOffset(today, 5), status: 'yellow', isComplete: false },
        { title: 'Submit PIA to Privacy Office for review', dueDate: withDayOffset(today, 15), status: 'yellow', isComplete: false },
      ],
    },

    // ── Demo Vendor Oversight Portal ─────────────────────────────────────────
    {
      riskCode: 'RISK-0005',
      projectName: 'Demo Vendor Oversight Portal',
      categoryName: 'Delivery',
      progress: 'escalated_to_issue',
      criticality: 'critical',
      title: 'Vendor master data reconciliation blocking go-live',
      statement: 'Inconsistent vendor identifiers across source systems have prevented a clean data load into the portal. Manual reconciliation is required across roughly 800 records before go-live can proceed.',
      impact: 'Portal launch delayed by at least 3 weeks; business users unable to access vendor SLA data.',
      closureCriteria: 'All vendor records reconciled, validated by the data steward, and successfully loaded into production.',
      spmId: 'SPM-3101',
      dateIdentified: withDayOffset(today, -85),
      impactDate: withDayOffset(today, -5),
      escalatedAt: withDayOffset(today, -10),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Map identifier crosswalk from all three source systems', dueDate: withDayOffset(today, -60), status: 'green', isComplete: true },
        { title: 'Run automated reconciliation script on test data', dueDate: withDayOffset(today, -30), status: 'green', isComplete: true },
        { title: 'Complete manual review of unmatched records', dueDate: withDayOffset(today, 5), status: 'red', isComplete: false },
        { title: 'Obtain data steward sign-off on reconciled dataset', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0006',
      projectName: 'Demo Vendor Oversight Portal',
      categoryName: 'Resources/Staffing',
      progress: 'open',
      criticality: 'moderate',
      title: 'Single point of failure for portal data integration ownership',
      statement: 'Only one engineer has full knowledge of the vendor data pipeline and transformation logic. If this person becomes unavailable, integration maintenance and incident response would be severely impacted.',
      impact: 'Integration incidents could take 3–5x longer to resolve without a backup owner.',
      closureCriteria: 'A second engineer has been trained and has independently resolved at least one integration issue.',
      dateIdentified: withDayOffset(today, -40),
      impactDate: withDayOffset(today, 60),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Document all pipeline components and runbooks', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Cross-train backup engineer on data pipeline', dueDate: withDayOffset(today, 30), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0007',
      projectName: 'Demo Vendor Oversight Portal',
      categoryName: 'Testing',
      progress: 'open',
      criticality: 'high',
      title: 'UAT participant availability limited during government travel season',
      statement: 'Ten of twelve planned UAT participants have notified the team of travel conflicts in the planned UAT window. Insufficient participation could result in inadequate coverage of critical business workflows.',
      impact: 'UAT sign-off delayed or conducted with insufficient coverage; defects may reach production.',
      closureCriteria: 'At least 8 of 12 planned UAT participants complete structured test scenarios.',
      dateIdentified: withDayOffset(today, -20),
      impactDate: withDayOffset(today, 25),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Reschedule UAT window to avoid peak travel conflicts', dueDate: withDayOffset(today, 5), status: 'yellow', isComplete: false },
        { title: 'Identify backup participants from adjacent teams', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0008',
      projectName: 'Demo Vendor Oversight Portal',
      categoryName: 'Funding',
      progress: 'assumed',
      criticality: 'low',
      title: 'Optional analytics module may not be funded in current fiscal year',
      statement: 'The advanced SLA analytics module is scoped as an optional enhancement. Current budget projections show a shortfall that may prevent its inclusion in this fiscal year.',
      impact: 'Analytics module deferred to next fiscal year; core portal features unaffected.',
      closureCriteria: 'Supplemental funding is secured or module is formally deferred to the next release cycle.',
      dateIdentified: withDayOffset(today, -50),
      submitterKey: 'ADMIN001',
    },

    // ── Demo AI Help Desk Assistant ──────────────────────────────────────────
    {
      riskCode: 'RISK-0009',
      projectName: 'Demo AI Help Desk Assistant',
      categoryName: 'Compliance',
      progress: 'escalated_to_issue',
      criticality: 'critical',
      title: 'AI governance approval workflow not finalized — pilot blocked',
      statement: 'The governance review for publishing knowledge sources to the AI assistant has not been approved. Without an approved workflow, no production content can be loaded and the pilot cannot proceed.',
      impact: 'Pilot launch blocked indefinitely; program credibility at risk with leadership.',
      closureCriteria: 'Governance workflow approved by security and knowledge management stakeholders; pilot corpus loaded.',
      spmId: 'SPM-4201',
      dateIdentified: withDayOffset(today, -60),
      impactDate: withDayOffset(today, -15),
      escalatedAt: withDayOffset(today, -15),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Draft governance workflow proposal', dueDate: withDayOffset(today, -45), status: 'green', isComplete: true },
        { title: 'Present proposal to security review board', dueDate: withDayOffset(today, -20), status: 'green', isComplete: true },
        { title: 'Incorporate security feedback into revised workflow', dueDate: withDayOffset(today, 5), status: 'red', isComplete: false },
        { title: 'Obtain final sign-off from knowledge management lead', dueDate: withDayOffset(today, 12), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0010',
      projectName: 'Demo AI Help Desk Assistant',
      categoryName: 'Technical Complexity',
      progress: 'open',
      criticality: 'high',
      title: 'LLM response hallucination rate exceeds acceptable threshold in testing',
      statement: 'During controlled testing the assistant produced responses that included plausible but incorrect policy citations in roughly 8% of test cases. The acceptable threshold for production is under 2%.',
      impact: 'Pilot delayed until hallucination rate is reduced; user trust risk if rate persists in production.',
      closureCriteria: 'Hallucination rate is below 2% on a representative test set of 500 queries.',
      spmId: 'SPM-4202',
      dateIdentified: withDayOffset(today, -45),
      impactDate: withDayOffset(today, 30),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Narrow knowledge corpus to high-confidence authoritative sources', dueDate: withDayOffset(today, -20), status: 'green', isComplete: true },
        { title: 'Add citation grounding layer to response pipeline', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Re-run test suite and measure hallucination rate', dueDate: withDayOffset(today, 20), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0011',
      projectName: 'Demo AI Help Desk Assistant',
      categoryName: 'Resources/Staffing',
      progress: 'open',
      criticality: 'moderate',
      title: 'No dedicated prompt engineer to maintain knowledge base quality',
      statement: 'The current staffing plan does not include a dedicated prompt engineer or knowledge curator. Ongoing quality degradation of the knowledge base is likely without a clear ownership model.',
      impact: 'Response quality will degrade over time; no clear escalation path for poor outputs.',
      closureCriteria: 'A knowledge curation role is defined, staffed, and operating with a documented quality cadence.',
      dateIdentified: withDayOffset(today, -25),
      impactDate: withDayOffset(today, 90),
      submitterKey: 'REVIEW01',
    },
    {
      riskCode: 'RISK-0012',
      projectName: 'Demo AI Help Desk Assistant',
      categoryName: 'Schedule',
      progress: 'open',
      criticality: 'high',
      title: 'Broader rollout timeline at risk if controlled beta slips',
      statement: 'The broader rollout milestone depends on a 4-week controlled beta window. Any slip in governance approval or corpus readiness will compress or eliminate buffer before the planned broader rollout date.',
      impact: 'Broader rollout delayed by one to two months; executive dashboard milestone affected.',
      closureCriteria: 'Controlled beta starts on schedule with full governance and corpus readiness confirmed.',
      dateIdentified: withDayOffset(today, -15),
      impactDate: withDayOffset(today, 60),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Finalize governance approval by current target date', dueDate: withDayOffset(today, 12), status: 'red', isComplete: false },
        { title: 'Prepare beta user communications and onboarding materials', dueDate: withDayOffset(today, 20), status: 'yellow', isComplete: false },
      ],
    },

    // ── Demo Records Automation Rollout ──────────────────────────────────────
    {
      riskCode: 'RISK-0013',
      projectName: 'Demo Records Automation Rollout',
      categoryName: 'Funding',
      progress: 'open',
      criticality: 'high',
      title: 'Phase 2 implementation funding not yet approved',
      statement: 'The discovery phase is proceeding under existing budget, but the build phase requires a separate funding approval that has not been obtained. Without it, the project will stall after requirements.',
      impact: 'Build phase cannot begin; project timeline pushed out by 3–6 months pending approval.',
      closureCriteria: 'Phase 2 funding formally approved and obligation authority issued.',
      spmId: 'SPM-2301',
      dateIdentified: withDayOffset(today, -9),
      impactDate: withDayOffset(today, 60),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Prepare funding justification package for leadership', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Brief program sponsor on funding gap and timeline impact', dueDate: withDayOffset(today, 15), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0014',
      projectName: 'Demo Records Automation Rollout',
      categoryName: 'Requirement',
      progress: 'open',
      criticality: 'moderate',
      title: 'Incomplete stakeholder participation in discovery interviews',
      statement: 'Two key records offices have not participated in discovery interviews. Requirements gaps in their workflows could surface late and require expensive rework during the build phase.',
      impact: 'Rework risk in build phase; potential missed compliance controls for those offices.',
      closureCriteria: 'All identified records offices have completed discovery interviews and reviewed draft requirements.',
      dateIdentified: withDayOffset(today, -5),
      impactDate: withDayOffset(today, 30),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Re-engage missing offices through program sponsor channel', dueDate: withDayOffset(today, 7), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0015',
      projectName: 'Demo Records Automation Rollout',
      categoryName: 'Compliance',
      progress: 'open',
      criticality: 'critical',
      title: 'Records retention rules not yet mapped to automated workflow triggers',
      statement: 'The automation design does not yet account for legally mandated retention schedules. If automation triggers do not align with NARA requirements, the agency could be in violation of federal records law.',
      impact: 'Legal non-compliance; potential audit finding; mandatory rework to records workflow engine.',
      closureCriteria: 'All retention rules reviewed with Records Officer and mapped to workflow triggers in the design document.',
      spmId: 'SPM-2302',
      dateIdentified: withDayOffset(today, -3),
      impactDate: withDayOffset(today, 45),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Schedule records retention review session with Records Officer', dueDate: withDayOffset(today, 7), status: 'yellow', isComplete: false },
        { title: 'Map retention schedule to workflow design document', dueDate: withDayOffset(today, 21), status: 'yellow', isComplete: false },
      ],
    },

    // ── Demo Grants Analytics Pilot ──────────────────────────────────────────
    {
      riskCode: 'RISK-0016',
      projectName: 'Demo Grants Analytics Pilot',
      categoryName: 'Delivery',
      progress: 'mitigated',
      criticality: 'moderate',
      title: 'Source data feed missed two weeks of historical grant records',
      statement: 'A configuration issue in one of the source ETL feeds caused a gap in historical grant data loaded into the pilot dashboards. Impacted records covered fiscal quarters Q1 and Q2.',
      impact: 'Dashboard metrics for Q1–Q2 were inaccurate for approximately two weeks; pilot user trust impacted.',
      closureCriteria: 'Historical backfill completed, validated, and data freshness checks added to the pipeline.',
      dateIdentified: withDayOffset(today, -200),
      impactDate: withDayOffset(today, -185),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Diagnose root cause of ETL feed gap', dueDate: withDayOffset(today, -198), status: 'green', isComplete: true },
        { title: 'Run one-time historical backfill load', dueDate: withDayOffset(today, -190), status: 'green', isComplete: true },
        { title: 'Add row-count validation check to ETL pipeline', dueDate: withDayOffset(today, -185), status: 'green', isComplete: true },
      ],
    },
    {
      riskCode: 'RISK-0017',
      projectName: 'Demo Grants Analytics Pilot',
      categoryName: 'Resources/Staffing',
      progress: 'escalated_to_issue',
      criticality: 'high',
      title: 'No sustainment owner identified after pilot closeout',
      statement: 'The pilot team disbanded at closeout without formally transitioning dashboard ownership to an operations team. The dashboards are live but unmonitored, and no one is accountable for data quality or user support.',
      impact: 'Dashboard data quality will degrade without ownership; user requests unanswered; potential decommission.',
      closureCriteria: 'A named sustainment owner is designated, trained, and has accepted an operating agreement.',
      spmId: 'SPM-5101',
      dateIdentified: withDayOffset(today, -40),
      impactDate: withDayOffset(today, -10),
      escalatedAt: withDayOffset(today, -10),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Identify candidate sustainment team from program operations', dueDate: withDayOffset(today, -20), status: 'green', isComplete: true },
        { title: 'Conduct handoff session with pilot team lead', dueDate: withDayOffset(today, 5), status: 'yellow', isComplete: false },
        { title: 'Execute operating agreement and document support contacts', dueDate: withDayOffset(today, 15), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0018',
      projectName: 'Demo Grants Analytics Pilot',
      categoryName: 'Technical Complexity',
      progress: 'mitigated',
      criticality: 'low',
      title: 'Dashboard query performance degraded under concurrent user load',
      statement: 'During user acceptance testing with 15 simultaneous users, several dashboard queries exceeded the 5-second response threshold. Performance was acceptable with fewer than 8 concurrent users.',
      impact: 'User frustration during peak reporting periods; potential adoption risk.',
      closureCriteria: 'Dashboard p95 query response time is under 3 seconds with 20 simulated concurrent users.',
      dateIdentified: withDayOffset(today, -180),
      impactDate: withDayOffset(today, -160),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Profile slow queries and add missing indexes', dueDate: withDayOffset(today, -175), status: 'green', isComplete: true },
        { title: 'Implement query result caching for summary metrics', dueDate: withDayOffset(today, -165), status: 'green', isComplete: true },
        { title: 'Re-run load test and confirm p95 threshold met', dueDate: withDayOffset(today, -160), status: 'green', isComplete: true },
      ],
    },

    // ── Additional cross-program variety ─────────────────────────────────────
    {
      riskCode: 'RISK-0019',
      projectName: 'Demo Treasury Intake Modernization',
      categoryName: 'Funding',
      progress: 'open',
      criticality: 'moderate',
      title: 'Operating budget covers only 70% of enterprise rollout cost',
      statement: 'The current approved budget covers the pilot and partial rollout but is insufficient for full enterprise adoption across all bureaus. A supplemental funding request is in progress but not yet approved.',
      impact: 'Enterprise rollout scope reduced or delayed pending additional funds.',
      closureCriteria: 'Supplemental funding approved or scope formally adjusted to match available budget.',
      dateIdentified: withDayOffset(today, -35),
      impactDate: withDayOffset(today, 90),
      submitterKey: 'REVIEW01',
      mitigationActions: [
        { title: 'Submit supplemental funding request to CFO office', dueDate: withDayOffset(today, -10), status: 'green', isComplete: true },
        { title: 'Prepare reduced-scope fallback plan', dueDate: withDayOffset(today, 20), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0020',
      projectName: 'Demo Vendor Oversight Portal',
      categoryName: 'Compliance',
      progress: 'escalated_to_issue',
      criticality: 'high',
      title: 'System security plan not updated to reflect new portal data flows',
      statement: 'The portal introduces new data flows between three systems that are not reflected in the current system security plan. ATO boundary changes require a formal SSP update and ISSM review before production launch.',
      impact: 'Production launch blocked; ATO may lapse if SSP is not updated within 30 days.',
      closureCriteria: 'SSP updated, ISSM review complete, and ATO boundary change approved.',
      spmId: 'SPM-3102',
      dateIdentified: withDayOffset(today, -25),
      impactDate: withDayOffset(today, -3),
      escalatedAt: withDayOffset(today, -3),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Draft SSP addendum covering new data flows', dueDate: withDayOffset(today, 5), status: 'red', isComplete: false },
        { title: 'Submit SSP update to ISSM for review', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Receive ATO boundary approval', dueDate: withDayOffset(today, 20), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0021',
      projectName: 'Demo AI Help Desk Assistant',
      categoryName: 'Requirement',
      progress: 'assumed',
      criticality: 'low',
      title: 'Edge-case multilingual queries not in scope for initial release',
      statement: 'Approximately 3% of historical help desk queries are in languages other than English. The initial release will not support multilingual queries; users will receive a fallback message directing them to call the service desk.',
      impact: 'Minimal user impact in initial release; potential equity concerns if not addressed in follow-on.',
      closureCriteria: 'Multilingual support added in a follow-on release or a policy decision is documented to defer indefinitely.',
      dateIdentified: withDayOffset(today, -20),
      submitterKey: 'REVIEW01',
    },
    {
      riskCode: 'RISK-0022',
      projectName: 'Demo Records Automation Rollout',
      categoryName: 'Schedule',
      progress: 'open',
      criticality: 'moderate',
      title: 'Dependency on shared integration platform creates scheduling conflict',
      statement: 'The records automation workflow requires changes to a shared integration platform also being modified by two other programs. Competing change requests could delay the records automation configuration window.',
      impact: 'Build phase delayed by 4–6 weeks if integration platform changes are not sequenced correctly.',
      closureCriteria: 'Change request is sequenced and approved on the shared platform roadmap with adequate window for records automation.',
      dateIdentified: withDayOffset(today, -7),
      impactDate: withDayOffset(today, 75),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Meet with platform team to review change request queue', dueDate: withDayOffset(today, 7), status: 'yellow', isComplete: false },
        { title: 'Escalate scheduling conflict to program steering committee if needed', dueDate: withDayOffset(today, 14), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0023',
      projectName: 'Demo Treasury Intake Modernization',
      categoryName: 'Delivery',
      progress: 'open',
      criticality: 'high',
      title: 'Third-party integration vendor behind on API delivery',
      statement: 'The external integration vendor contracted for document classification services has delivered only 40% of the agreed API endpoints by the midpoint checkpoint. At current pace, the full API will not be ready before integration testing begins.',
      impact: 'Integration testing phase delayed by 3–4 weeks; downstream release milestone at risk.',
      closureCriteria: 'All contracted API endpoints are delivered, documented, and passing acceptance tests.',
      spmId: 'SPM-2204',
      dateIdentified: withDayOffset(today, -18),
      impactDate: withDayOffset(today, 35),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Issue formal cure notice to integration vendor', dueDate: withDayOffset(today, 3), status: 'yellow', isComplete: false },
        { title: 'Evaluate in-house stub implementation as fallback', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Brief COR on vendor delivery status', dueDate: withDayOffset(today, 5), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0024',
      projectName: 'Demo Vendor Oversight Portal',
      categoryName: 'Delivery',
      progress: 'open',
      criticality: 'moderate',
      title: 'Launch communications plan not drafted',
      statement: 'No communications plan exists for the portal go-live. Without advance notice to vendor managers and bureau liaisons, adoption may be slow and support volumes could spike unexpectedly.',
      impact: 'Low adoption in first 30 days; elevated help desk volume at launch.',
      closureCriteria: 'Launch communications plan approved and distribution list confirmed 2 weeks before go-live.',
      dateIdentified: withDayOffset(today, -10),
      impactDate: withDayOffset(today, 20),
      submitterKey: 'EDIT001',
      mitigationActions: [
        { title: 'Draft communications plan and distribution list', dueDate: withDayOffset(today, 8), status: 'yellow', isComplete: false },
        { title: 'Review with program office and get approval', dueDate: withDayOffset(today, 14), status: 'yellow', isComplete: false },
      ],
    },
    {
      riskCode: 'RISK-0025',
      projectName: 'Demo AI Help Desk Assistant',
      categoryName: 'Funding',
      progress: 'open',
      criticality: 'moderate',
      title: 'Ongoing LLM API costs not included in steady-state budget',
      statement: 'The program budget covers development costs but does not include ongoing API usage fees for the language model. Usage costs in production are projected to exceed $40K/year, which has no current funding source.',
      impact: 'Operational funding gap after launch; service may need to be throttled or suspended.',
      closureCriteria: 'Ongoing LLM API costs are baselined and included in the program\'s operations budget.',
      dateIdentified: withDayOffset(today, -12),
      impactDate: withDayOffset(today, 120),
      submitterKey: 'ADMIN001',
      mitigationActions: [
        { title: 'Prepare cost projection model for steady-state operations', dueDate: withDayOffset(today, 10), status: 'yellow', isComplete: false },
        { title: 'Submit operations budget amendment to include LLM costs', dueDate: withDayOffset(today, 25), status: 'yellow', isComplete: false },
      ],
    },
  ];

  for (const r of risks) {
    const proj = sp[r.projectName];
    if (!proj) { console.warn(`  Skipping risk ${r.riskCode}: project "${r.projectName}" not found`); continue; }
    const categoryId = cat[r.categoryName];
    if (!categoryId) { console.warn(`  Skipping risk ${r.riskCode}: category "${r.categoryName}" not found`); continue; }
    const submitterId = refs.users[r.submitterKey];
    if (!submitterId) { console.warn(`  Skipping risk ${r.riskCode}: user "${r.submitterKey}" not found`); continue; }

    const risk = await prisma.risk.upsert({
      where: { riskCode: r.riskCode },
      update: {
        progress: r.progress,
        programId: proj.programId,
        statusProjectId: proj.id,
        categoryId,
        spmId: r.spmId ?? null,
        title: r.title,
        statement: r.statement,
        criticality: r.criticality,
        submitterId,
        dateIdentified: r.dateIdentified,
        impact: r.impact ?? null,
        impactDate: r.impactDate ?? null,
        closureCriteria: r.closureCriteria ?? null,
        escalatedAt: r.escalatedAt ?? null,
      },
      create: {
        riskCode: r.riskCode,
        progress: r.progress,
        programId: proj.programId,
        statusProjectId: proj.id,
        categoryId,
        spmId: r.spmId ?? null,
        title: r.title,
        statement: r.statement,
        criticality: r.criticality,
        submitterId,
        dateIdentified: r.dateIdentified,
        impact: r.impact ?? null,
        impactDate: r.impactDate ?? null,
        closureCriteria: r.closureCriteria ?? null,
        escalatedAt: r.escalatedAt ?? null,
      },
      select: { id: true },
    });

    if (r.mitigationActions?.length) {
      await prisma.riskMitigationAction.deleteMany({ where: { riskId: risk.id } });
      await prisma.riskMitigationAction.createMany({
        data: r.mitigationActions.map((a, i) => ({
          riskId: risk.id,
          title: a.title,
          dueDate: a.dueDate ?? null,
          status: a.status,
          isComplete: a.isComplete,
          sortOrder: i,
        })),
      });
    }
  }

  console.log(`  Seeded ${risks.length} risks/issues.`);
}

async function main() {
  console.log('Seeding database...');
  await seedReferenceData();
  const refs = await loadRefs();
  await seedProjectsAndStatusData(refs);
  await seedResourcesAndAssignments(refs);
  await seedIntake(refs);
  await seedRisksAndIssues(refs);
  console.log('Seeding complete!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
