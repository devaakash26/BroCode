import { PrismaClient } from "@prisma/client";

// This prevents multiple prisma instances in development
const globalForPrisma = global;

// Initialize Prisma client
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return client;
};

// Create the Prisma client singleton or reuse the existing one
const prisma = globalForPrisma.prisma || createPrismaClient();

// Only assign to global in development to prevent memory leaks
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Function to safely disconnect Prisma
const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
};

// Function to check database connection
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { isConnected: true, error: null };
  } catch (error) {
    console.error("Database connection check failed:", error);
    return { isConnected: false, error: error.message };
  }
};

// Function to check if using fallback mode
const isUsingFallbackMode = () => {
  return process.env.DATABASE_URL?.includes("pooler.supabase.com") || false;
};

export {
  prisma,
  disconnectPrisma,
  checkDatabaseConnection,
  isUsingFallbackMode,
};
