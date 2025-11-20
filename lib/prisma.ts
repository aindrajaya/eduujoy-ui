import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Get connection string from environment
const connectionString = process.env.DATABASE_URL || '';

// Create Neon adapter for serverless (pass connection string directly)
const adapter = new PrismaNeon(connectionString as any);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
