import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getClient = () => {
    const url = process.env.DATABASE_URL;

    if (!url) {
        throw new Error('DATABASE_URL is not defined');
    }

    // Standard Postgres connection via adapter
    // Manual parsing to ensure password is a string
    const match = url.match(/postgresql:\/\/([^:]+):(.*)@([^:]+):(\d+)\/(.+)/);

    let pool;
    if (match) {
        const [, user, password, host, port, database] = match;
        pool = new Pool({
            user,
            password,
            host,
            port: parseInt(port),
            database: database.split('?')[0],
            ssl: url.includes('sslmode=require') || url.includes('ssl=true') ? { rejectUnauthorized: false } : false
        });
    } else {
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
