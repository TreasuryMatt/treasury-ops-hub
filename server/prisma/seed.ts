import 'dotenv/config';
import { PrismaClient, AppRole, UserType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Roles (from Data Validation sheet) ──
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

  const roles: Record<string, string> = {};
  for (let i = 0; i < roleNames.length; i++) {
    const role = await prisma.role.upsert({
      where: { name: roleNames[i] },
      update: {},
      create: { name: roleNames[i], sortOrder: i },
    });
    roles[role.name] = role.id;
  }
  console.log(`  ${roleNames.length} roles seeded`);

  // ── Functional Areas ──
  const functionalAreas = [
    // Shared across divisions
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

  for (let i = 0; i < functionalAreas.length; i++) {
    const fa = functionalAreas[i];
    await prisma.functionalArea.upsert({
      where: { name: fa.name },
      update: {},
      create: { name: fa.name, division: fa.division as any, sortOrder: i },
    });
  }
  console.log(`  ${functionalAreas.length} functional areas seeded`);

  // ── Products ──
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
      update: {},
      create: { name },
    });
  }
  console.log(`  ${productNames.length} products seeded`);

  // ── Default test users (one per app role) ──
  const testUsers = [
    { caiaId: 'ADMIN001', email: 'admin@treasury.gov',   displayName: 'System Admin',      role: AppRole.admin,  userType: UserType.staff,    isIntakeReviewer: true,  isResourceManager: true },
    { caiaId: 'EDIT001',  email: 'editor@treasury.gov',  displayName: 'Test Editor',       role: AppRole.editor, userType: UserType.staff,    isIntakeReviewer: false, isResourceManager: false },
    { caiaId: 'VIEW001',  email: 'viewer@treasury.gov',  displayName: 'Test Viewer',       role: AppRole.viewer, userType: UserType.staff,    isIntakeReviewer: false, isResourceManager: false },
    { caiaId: 'REVIEW01', email: 'reviewer@treasury.gov', displayName: 'Intake Reviewer',  role: AppRole.editor, userType: UserType.staff,    isIntakeReviewer: true,  isResourceManager: false },
    { caiaId: 'RMGR001',  email: 'resourcemgr@treasury.gov', displayName: 'Resource Manager', role: AppRole.viewer, userType: UserType.staff, isIntakeReviewer: false, isResourceManager: true },
    { caiaId: 'CUST001',  email: 'customer1@treasury.gov', displayName: 'Alice Customer',  role: AppRole.viewer, userType: UserType.customer, isIntakeReviewer: false, isResourceManager: false },
    { caiaId: 'CUST002',  email: 'customer2@treasury.gov', displayName: 'Bob Customer',    role: AppRole.viewer, userType: UserType.customer, isIntakeReviewer: false, isResourceManager: false },
  ];
  await prisma.user.upsert({
    where: { caiaId: 'MGR001' },
    update: {
      displayName: 'Legacy Manager (Inactive)',
      role: AppRole.viewer,
      userType: UserType.staff,
      isIntakeReviewer: false,
      isResourceManager: false,
      isActive: false,
    },
    create: {
      caiaId: 'MGR001',
      email: 'manager@treasury.gov',
      displayName: 'Legacy Manager (Inactive)',
      role: AppRole.viewer,
      userType: UserType.staff,
      isIntakeReviewer: false,
      isResourceManager: false,
      isActive: false,
    },
  });
  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { caiaId: u.caiaId },
      update: u,
      create: u,
    });
  }
  console.log('  Default test users seeded (including intake reviewer, resource manager, and customers)');

  // ── Project Status Reference Data ──

  // Departments
  const deptNames = [
    'TEOAF', 'BFS', 'BPD', 'DO', 'FMS', 'IRS', 'Mint', 'OCC',
    'OIG', 'SIGTARP', 'TTB', 'FinCEN', 'OFAC', 'OTS', 'CDFI',
  ];
  for (const name of deptNames) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ${deptNames.length} departments seeded`);

  // Status Priorities
  const priorities = [
    { name: '1 - Critical', sortOrder: 1 },
    { name: '2 - High', sortOrder: 2 },
    { name: '3 - Medium', sortOrder: 3 },
    { name: '4 - Low', sortOrder: 4 },
  ];
  for (const p of priorities) {
    await prisma.statusPriority.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }
  console.log(`  ${priorities.length} status priorities seeded`);

  // Execution Types
  const execTypes = ['Waterfall', 'Agile', 'Hybrid', 'SAFe'];
  for (const name of execTypes) {
    await prisma.executionType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ${execTypes.length} execution types seeded`);

  // Customer Categories
  const custCats = ['Departmental Offices', 'Bureaus', 'External', 'Internal'];
  for (const name of custCats) {
    await prisma.customerCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ${custCats.length} customer categories seeded`);

  // RAG Definitions
  const ragDefs = [
    { color: 'green', label: 'On Track', description: 'Project is proceeding as planned with no significant issues.' },
    { color: 'yellow', label: 'At Risk', description: 'Project has issues that may impact schedule, scope, or budget if not addressed.' },
    { color: 'red', label: 'Off Track', description: 'Project has critical issues impacting schedule, scope, or budget.' },
    { color: 'gray', label: 'Not Started', description: 'Project has not yet begun execution.' },
  ];
  for (const rag of ragDefs) {
    await prisma.ragDefinition.upsert({
      where: { color: rag.color },
      update: {},
      create: rag,
    });
  }
  console.log(`  ${ragDefs.length} RAG definitions seeded`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
