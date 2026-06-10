import { PrismaClient } from "@prisma/client";

// Återanvänd samma klient mellan hot reloads i dev så att
// anslutningarna mot Neon inte växer obegränsat.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
