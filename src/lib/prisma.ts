import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const url = process.env.DATABASE_URL;
const isAccelerated = url?.startsWith('prisma://') || url?.startsWith('prisma+postgres://');

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        ...(isAccelerated ? { accelerateUrl: url } : {}),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
