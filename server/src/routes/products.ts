import { Router, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../utils/audit';

export const productsRouter = Router();
productsRouter.use(requireAuth);

const PRODUCT_INCLUDE = {
  programs: {
    include: { program: { select: { id: true, name: true } } },
  },
  platform: { select: { id: true, name: true } },
  _count: { select: { statusProjects: true, childProducts: true } },
};

const PRODUCT_DETAIL_INCLUDE = {
  programs: {
    include: { program: { select: { id: true, name: true } } },
  },
  platform: { select: { id: true, name: true } },
  childProducts: {
    where: { isActive: true },
    select: { id: true, name: true, productType: true, productStatus: true, vendor: true },
    orderBy: { name: 'asc' as const },
  },
  statusProjects: {
    include: {
      statusProject: {
        select: { id: true, name: true, status: true, programId: true, program: { select: { name: true } } },
      },
    },
  },
  _count: { select: { statusProjects: true } },
};

// GET /api/products
productsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { programId, productType, productStatus } = req.query as Record<string, string>;

  const where: any = { isActive: true };
  if (productType) where.productType = productType;
  if (productStatus) where.productStatus = productStatus;
  if (programId) {
    where.programs = { some: { programId } };
  }

  const products = await prisma.product.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy: { name: 'asc' },
  });

  res.json({ data: products });
});

// GET /api/products/:id
productsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id as string },
    include: PRODUCT_DETAIL_INCLUDE,
  });

  if (!product || !product.isActive) return next(new AppError('Product not found', 404));
  res.json({ data: product });
});

// POST /api/products
productsRouter.post('/', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const b = req.body;
    const programIds: string[] = b.programIds || [];

    const product = await prisma.product.create({
      data: {
        name: b.name,
        description: b.description || null,
        productType: b.productType || 'APPLICATION',
        vendor: b.vendor || null,
        isInternal: b.isInternal ?? false,
        productStatus: b.productStatus || 'ACTIVE',
        criticality: b.criticality || 'MEDIUM',
        hostingModel: b.hostingModel || null,
        platformId: b.platformId || null,
        productOwner: b.productOwner || null,
        technicalOwner: b.technicalOwner || null,
        primaryUrl: b.primaryUrl || null,
        documentationUrl: b.documentationUrl || null,
        logoUrl: b.logoUrl || null,
        userCount: b.userCount ? Number(b.userCount) : null,
        annualCost: b.annualCost ? b.annualCost : null,
        contractExpiry: b.contractExpiry ? new Date(b.contractExpiry) : null,
        version: b.version || null,
        atoStatus: b.atoStatus || null,
        atoExpiry: b.atoExpiry ? new Date(b.atoExpiry) : null,
        fedrampLevel: b.fedrampLevel || null,
        dataClassification: b.dataClassification || null,
        programs: programIds.length
          ? { create: programIds.map((pid: string) => ({ programId: pid })) }
          : undefined,
      },
      include: PRODUCT_DETAIL_INCLUDE,
    });

    await logAction(req.user!.id, 'create', 'product', product.id, {}, req.ip);
    res.status(201).json({ data: product });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/products/:id
productsRouter.put('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const b = req.body;

    // Replace program associations if provided
    if (Array.isArray(b.programIds)) {
      await prisma.$transaction([
        prisma.productProgram.deleteMany({ where: { productId: id } }),
        ...(b.programIds.length
          ? [prisma.productProgram.createMany({
              data: b.programIds.map((pid: string) => ({ productId: id, programId: pid })),
            })]
          : []),
      ]);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: b.name ?? undefined,
        description: b.description !== undefined ? (b.description || null) : undefined,
        productType: b.productType ?? undefined,
        vendor: b.vendor !== undefined ? (b.vendor || null) : undefined,
        isInternal: b.isInternal ?? undefined,
        productStatus: b.productStatus ?? undefined,
        criticality: b.criticality ?? undefined,
        hostingModel: b.hostingModel !== undefined ? (b.hostingModel || null) : undefined,
        platformId: b.platformId !== undefined ? (b.platformId || null) : undefined,
        productOwner: b.productOwner !== undefined ? (b.productOwner || null) : undefined,
        technicalOwner: b.technicalOwner !== undefined ? (b.technicalOwner || null) : undefined,
        primaryUrl: b.primaryUrl !== undefined ? (b.primaryUrl || null) : undefined,
        documentationUrl: b.documentationUrl !== undefined ? (b.documentationUrl || null) : undefined,
        logoUrl: b.logoUrl !== undefined ? (b.logoUrl || null) : undefined,
        userCount: b.userCount !== undefined ? (b.userCount ? Number(b.userCount) : null) : undefined,
        annualCost: b.annualCost !== undefined ? (b.annualCost || null) : undefined,
        contractExpiry: b.contractExpiry !== undefined ? (b.contractExpiry ? new Date(b.contractExpiry) : null) : undefined,
        version: b.version !== undefined ? (b.version || null) : undefined,
        atoStatus: b.atoStatus !== undefined ? (b.atoStatus || null) : undefined,
        atoExpiry: b.atoExpiry !== undefined ? (b.atoExpiry ? new Date(b.atoExpiry) : null) : undefined,
        fedrampLevel: b.fedrampLevel !== undefined ? (b.fedrampLevel || null) : undefined,
        dataClassification: b.dataClassification !== undefined ? (b.dataClassification || null) : undefined,
      },
      include: PRODUCT_DETAIL_INCLUDE,
    });

    await logAction(req.user!.id, 'update', 'product', product.id, {}, req.ip);
    res.json({ data: product });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// DELETE /api/products/:id (soft delete)
productsRouter.delete('/:id', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    await logAction(req.user!.id, 'delete', 'product', id, {}, req.ip);
    res.json({ message: 'Product deactivated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});

// PUT /api/products/:id/projects — replace all project associations for a product
productsRouter.put('/:id/projects', requireEditor, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { statusProjectIds } = req.body as { statusProjectIds: string[] };

    await prisma.$transaction([
      prisma.productStatusProject.deleteMany({ where: { productId: id } }),
      ...(statusProjectIds?.length
        ? [prisma.productStatusProject.createMany({
            data: statusProjectIds.map((spid: string) => ({ productId: id, statusProjectId: spid })),
          })]
        : []),
    ]);

    res.json({ message: 'Project associations updated' });
  } catch (err: any) {
    next(new AppError(err.message, 400));
  }
});
