import * as XLSX from 'xlsx';
import { prisma } from './prisma';

interface ImportResult {
  resourcesCreated: number;
  assignmentsCreated: number;
  errors: Array<{ row: number; sheet: string; error: string }>;
}

// Normalize "Last, First" → cache key
function nameKey(raw: string) {
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function importExcel(buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result: ImportResult = { resourcesCreated: 0, assignmentsCreated: 0, errors: [] };

  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));
  const products = await prisma.product.findMany();
  const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));
  const funcAreas = await prisma.functionalArea.findMany();
  const funcAreaMap = new Map(funcAreas.map((fa) => [fa.name.toLowerCase(), fa.id]));

  // name key → resource id
  const resourceCache = new Map<string, string>();
  // name key → { supervisorRaw, secondLineRaw } to wire up after all resources created
  const supervisorPending = new Map<string, { sup: string | null; sec: string | null }>();

  for (const sheetName of ['Federal Resources', 'Contractor Resources']) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const isContractor = sheetName === 'Contractor Resources';
    const resourceType = isContractor ? 'contractor' : 'federal';
    const rangeOpts = isContractor ? { defval: '' } : { defval: '', range: 1 };
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, rangeOpts);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nameCol = Object.keys(row).find((k) => k.includes('Resource Name'));
        const nameVal = nameCol ? String(row[nameCol]).trim() : '';
        if (!nameVal) continue;

        const [lastName, firstName] = nameVal.split(',').map((s) => s.trim());
        if (!lastName || !firstName) continue;

        const key = nameKey(nameVal);

        if (!resourceCache.has(key)) {
          const divisionCol = String(row['Division'] || '').toLowerCase().trim();
          const division = (['operations', 'engineering', 'pmso'].includes(divisionCol) ? divisionCol : 'operations') as any;

          const funcAreaCol = Object.keys(row).find((k) => k.includes('Functional Area'));
          const funcAreaName = funcAreaCol ? String(row[funcAreaCol]).trim() : '';
          const functionalAreaId = funcAreaName ? funcAreaMap.get(funcAreaName.toLowerCase()) || null : null;

          const primaryRoleCol = Object.keys(row).find((k) => k.includes('Primary Role'));
          const primaryRoleName = primaryRoleCol ? String(row[primaryRoleCol]).trim() : '';
          const primaryRoleId = primaryRoleName ? roleMap.get(primaryRoleName.toLowerCase()) || null : null;

          const secondaryRoleCol = Object.keys(row).find((k) => k.includes('Secondary Role'));
          const secondaryRoleName = secondaryRoleCol ? String(row[secondaryRoleCol]).trim() : '';
          const secondaryRoleId = secondaryRoleName ? roleMap.get(secondaryRoleName.toLowerCase()) || null : null;

          // Store supervisor names for second pass — don't write FKs yet
          const supervisorCol = Object.keys(row).find((k) => k.includes('Supervisor / Lead'));
          const supervisorRaw = supervisorCol ? String(row[supervisorCol]).trim() || null : null;
          const secondLineCol = Object.keys(row).find((k) => k.includes('Second Line'));
          const secondLineRaw = secondLineCol ? String(row[secondLineCol]).trim() || null : null;

          const opsEngCol = Object.keys(row).find((k) => k.includes('Operations Lead') || k.includes('Engineering Lead'));
          const opsEngLead = opsEngCol ? String(row[opsEngCol]).trim() || null : null;

          const gsCol = Object.keys(row).find((k) => k.includes('Fed GS'));
          const gsLevel = !isContractor && gsCol ? String(row[gsCol]).trim() || null : null;

          const matrixedCol = Object.keys(row).find((k) => k.includes('Matrixed'));
          const isMatrixed = !isContractor && matrixedCol ? String(row[matrixedCol]).toLowerCase() === 'yes' : null;

          const availCol = Object.keys(row).find((k) => k.includes('Available for Work'));
          const availableForWork = availCol ? String(row[availCol]).toLowerCase() === 'yes' : false;

          const notesCol = Object.keys(row).find((k) => k.includes('Notes'));
          const notes = notesCol ? String(row[notesCol]).trim() || null : null;

          let popStartDate = null;
          let popEndDate = null;
          if (isContractor) {
            const popStartCol = Object.keys(row).find((k) => k.includes('POP Start'));
            const popEndCol = Object.keys(row).find((k) => k.includes('POP End'));
            if (popStartCol && row[popStartCol]) popStartDate = new Date(row[popStartCol]);
            if (popEndCol && row[popEndCol]) popEndDate = new Date(row[popEndCol]);
          }

          const resource = await prisma.resource.create({
            data: {
              resourceType,
              firstName,
              lastName,
              division,
              functionalAreaId,
              primaryRoleId,
              secondaryRoleId,
              opsEngLead,
              gsLevel,
              isMatrixed,
              popStartDate: popStartDate && !isNaN(popStartDate.getTime()) ? popStartDate : null,
              popEndDate: popEndDate && !isNaN(popEndDate.getTime()) ? popEndDate : null,
              availableForWork,
              notes,
            },
          });

          resourceCache.set(key, resource.id);
          supervisorPending.set(key, { sup: supervisorRaw, sec: secondLineRaw });
          result.resourcesCreated++;
        }

        // Create assignment
        const projectCol = Object.keys(row).find((k) => k === 'Project');
        const projectName = projectCol ? String(row[projectCol]).trim() : '';
        if (!projectName) continue;

        const productCol = Object.keys(row).find((k) => k === 'Product');
        const productName = productCol ? String(row[productCol]).trim() : '';
        const productId = productName ? productMap.get(productName.toLowerCase()) || null : null;

        const statusCol = Object.keys(row).find((k) => k.includes('Project Status'));
        const statusVal = statusCol ? String(row[statusCol]).toLowerCase().trim() : 'in_progress';
        const status = statusVal === 'on hold' ? 'on_hold' : statusVal === 'completed' ? 'completed' : 'in_progress';

        let project = await prisma.project.findFirst({ where: { name: projectName } });
        if (!project) {
          const startDateCol = Object.keys(row).find((k) => k.includes('Project Start Date'));
          const endDateCol = Object.keys(row).find((k) => k.includes('Project End Date'));
          const startDate = startDateCol && row[startDateCol] ? new Date(row[startDateCol]) : null;
          const endDate = endDateCol && row[endDateCol] ? new Date(row[endDateCol]) : null;

          project = await prisma.project.create({
            data: {
              name: projectName,
              productId,
              status: status as any,
              startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
              endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
            },
          });
        }

        const utilCol = Object.keys(row).find((k) => k.includes('Percent') && (k.includes('Utilized') || k.includes('Utlized')) && !k.includes('Total') && !k.includes('DO NOT'));
        let percentUtilized = 0;
        if (utilCol) {
          const val = parseFloat(String(row[utilCol]));
          if (!isNaN(val)) percentUtilized = val > 1 ? val / 100 : val;
        }

        const resourceId = resourceCache.get(key)!;
        const primaryRoleCol2 = Object.keys(row).find((k) => k.includes('Primary Role'));
        const roleName = primaryRoleCol2 ? String(row[primaryRoleCol2]).trim() : '';
        const roleId = roleName ? roleMap.get(roleName.toLowerCase()) || null : null;

        const existing = await prisma.assignment.findFirst({
          where: { resourceId, projectId: project.id, roleId },
        });

        if (!existing) {
          await prisma.assignment.create({
            data: { resourceId, projectId: project.id, roleId, percentUtilized },
          });
          result.assignmentsCreated++;
        }
      } catch (err: any) {
        result.errors.push({ row: i + 2, sheet: sheetName, error: err.message });
      }
    }
  }

  // ── Second pass: wire supervisor FKs and mark isSupervisor ──────────────────
  // Build a lookup: "last, first" (lowercased) → resource id
  const allResources = await prisma.resource.findMany({ select: { id: true, firstName: true, lastName: true } });
  const idByName = new Map(allResources.map((r) => [nameKey(`${r.lastName}, ${r.firstName}`), r.id]));

  // Collect all supervisor IDs so we can mark them
  const supervisorIds = new Set<string>();

  for (const [key, { sup, sec }] of supervisorPending) {
    const resourceId = resourceCache.get(key);
    if (!resourceId) continue;

    const supId = sup ? idByName.get(nameKey(sup)) ?? null : null;
    const secId = sec ? idByName.get(nameKey(sec)) ?? null : null;

    if (supId) supervisorIds.add(supId);
    if (secId) supervisorIds.add(secId);

    if (supId !== null || secId !== null) {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { supervisorId: supId, secondLineSupervisorId: secId },
      });
    }
  }

  // Mark all referenced supervisors
  if (supervisorIds.size > 0) {
    await prisma.resource.updateMany({
      where: { id: { in: Array.from(supervisorIds) } },
      data: { isSupervisor: true },
    });
  }

  return result;
}
