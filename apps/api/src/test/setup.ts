import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  if (process.env.TEST_DATABASE_URL) {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    await prisma.$connect();
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});
