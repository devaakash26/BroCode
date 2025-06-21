import { PrismaClient } from '@prisma/client';

// This prevents multiple prisma instances in development
const globalForPrisma = global;

// Initialize Prisma client with error handling
const createPrismaClient = () => {
  try {
    const client = new PrismaClient({
      log: ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Add middleware for error handling
    client.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error) {
        console.error(`Database error in ${params.model}.${params.action}:`, error);
        throw error;
      }
    });

    return client;
  } catch (error) {
    console.error('Error creating Prisma client:', error);
    throw error;
  }
};

// Create the Prisma client singleton or reuse the existing one
const prisma = globalForPrisma.prisma || createPrismaClient();

// Only assign to global in development to prevent memory leaks
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Function to safely disconnect Prisma
const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
};

// Function to check database connection
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { isConnected: true, error: null };
  } catch (error) {
    console.error('Database connection check failed:', error);
    return { isConnected: false, error: error.message };
  }
};

// Function to check if using fallback mode
const isUsingFallbackMode = () => {
  return process.env.DATABASE_URL?.includes('pooler.supabase.com') || false;
};

export { prisma, disconnectPrisma, checkDatabaseConnection, isUsingFallbackMode }; 
