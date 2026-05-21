import './env-validation';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getClient = () => {
    const url = process.env.DATABASE_URL;

    if (!url) {
        throw new Error('DATABASE_URL is not defined');
    }

    // Use URL parser for safe credential extraction (handles special chars in passwords)
    let pool;
    try {
        const parsedUrl = new URL(url);
        pool = new Pool({
            user: parsedUrl.username,
            password: decodeURIComponent(parsedUrl.password),
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port),
            database: parsedUrl.pathname.slice(1).split('?')[0],
            ssl: url.includes('sslmode=require') || url.includes('ssl=true') ? { rejectUnauthorized: false } : false
        });
    } catch {
        // Fallback for connection strings that aren't valid URLs
        pool = new Pool({ connectionString: url });
    }

    const adapter = new PrismaPg(pool);
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};

export const prisma = globalForPrisma.prisma || getClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
