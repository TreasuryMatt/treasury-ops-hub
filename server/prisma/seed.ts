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
  applications: Record<string, string>;
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
  applicationId?: string | null;
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
        applicationId: data.applicationId ?? null,
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
      applicationId: data.applicationId ?? null,
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

  const productNames = [
    'Adjudication Trackers',
    'AIRS',
    'Architecture & Integration',
    'BFS Existing Work',
    'Connect.gov',
    'Content Management',
    'DCFO',
    'Discovery',
    'eDiscovery',
    'eDiscovery/FOIAxPress',
    'IHRITT',
    'IRS Discovery',
    'Mint Transition',
    'O&M (SF)',
    'O&M (SNOW)',
    'OneFM',
    'P4P',
    'Platform Enhancements & Support',
    'PMSO',
    'Portals/Events',
    'Rules of Behavior',
    'ServiceNow',
    'ServiceNow Next Experience Upgrade',
    'Software Management',
    'TEI',
    'TRAMS/OCA',
    'Txcess/WSD/Nuvolo/Impress',
  ];

  for (const name of productNames) {
    await prisma.product.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
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

  const applicationConfigs = [
    ['Demo Intake Transformation Program', 'Demo Intake Portal'],
    ['Demo Intake Transformation Program', 'Demo Review Workbench'],
    ['Demo Vendor Operations Program', 'Demo Vendor Oversight'],
    ['Demo Vendor Operations Program', 'Demo Contract Analytics'],
    ['Demo AI Enablement Program', 'Demo Service Desk Copilot'],
    ['Demo Analytics Acceleration Program', 'Demo Grants Insight Hub'],
  ] as const;

  for (const [programName, appName] of applicationConfigs) {
    const programId = programs.find((program) => program.name === programName)?.id;
    if (!programId) continue;

    await prisma.application.upsert({
      where: { programId_name: { programId, name: appName } },
      update: { description: `${DEMO_TAG} ${appName}`, isActive: true },
      create: {
        programId,
        name: appName,
        description: `${DEMO_TAG} ${appName}`,
        isActive: true,
      },
    });
  }

  const applications = await prisma.application.findMany({
    select: { id: true, name: true, program: { select: { name: true } } },
  });

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
    applications: Object.fromEntries(applications.map((app) => [`${app.program.name}::${app.name}`, app.id])),
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
      applicationId: refs.applications[`${config.programName}::${config.applicationName}`],
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

    await prisma.statusProjectProduct.deleteMany({ where: { statusProjectId: statusProject.id } });
    await prisma.statusProjectProduct.createMany({
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

async function main() {
  console.log('Seeding database...');
  await seedReferenceData();
  const refs = await loadRefs();
  await seedProjectsAndStatusData(refs);
  await seedResourcesAndAssignments(refs);
  await seedIntake(refs);
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
