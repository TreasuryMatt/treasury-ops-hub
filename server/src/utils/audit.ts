import { prisma } from '../services/prisma';

export async function logAction(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details?: object,
  ipAddress?: string | string[]
): Promise<void> {
  const ip = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress;
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      ipAddress: ip,
    },
  });
}
