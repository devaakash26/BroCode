import { PrismaClient } from '@prisma/client';

// This prevents multiple prisma instances in development
const globalForPrisma = global;

// Flag to track if we're using fallback mode due to database connection issues
let usingFallbackMode = false;

// Initialize Prisma client with error handling and connection management
const createPrismaClient = () => {
  try {
    // Set up the connection parameters with more detailed logging
    const client = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Add client options to help with slow connections
      __internal: {
        engine: {
          connectionTimeout: 10000, // 10 seconds connection timeout
          // Retry 3 times with exponential backoff
          retry: {
            max: 3,
            factor: 2,
            retryIf: (err) => {
              const isRetryableError = !err.code || (
                err.code.includes('connection') || 
                err.code.includes('timeout') || 
                err.code.includes('peer')
              );
              console.log('Prisma connection error:', err.message, 'Retryable:', isRetryableError);
              return isRetryableError;
            },
          },
        },
      },
    });

    // Add middleware for error handling
    client.$use(async (params, next) => {
      try {
        const result = await next(params);
        return result;
      } catch (error) {
        // Log the error with the operation that failed
        console.error(`Prisma error in ${params.model}.${params.action}:`, error);
        
        // If in fallback mode, return mock data for read operations
        if (usingFallbackMode && (params.action === 'findUnique' || params.action === 'findMany' || params.action === 'findFirst')) {
          console.log(`Using fallback data for ${params.model}.${params.action}`);
          return getFallbackData(params.model, params.action, params.args);
        }
        
        // Rethrow the error with additional context
        throw error;
      }
    });

    return client;
  } catch (error) {
    console.error('Error creating Prisma client:', error);
    usingFallbackMode = true;
    return createFallbackClient();
  }
};

// Create a fallback client that returns mock data when database is unavailable
function createFallbackClient() {
  console.log('⚠️ DATABASE CONNECTION FAILED: Using fallback mode with mock data');
  
  // Create a mock client object with the same interface as PrismaClient
  return {
    $connect: async () => console.log('Mock connection established'),
    $disconnect: async () => console.log('Mock connection closed'),
    $queryRaw: async () => [{ connection_test: 1 }],
    $use: () => {},
    
    // Add mock implementations for common models
    user: {
      findUnique: async (args) => getFallbackData('user', 'findUnique', args),
      findMany: async (args) => getFallbackData('user', 'findMany', args),
      create: async () => ({ id: 'mock-user-id', name: 'Mock User', email: 'mock@example.com' }),
      update: async () => ({ id: 'mock-user-id', name: 'Updated Mock User', email: 'mock@example.com' }),
    },
    
    group: {
      findUnique: async (args) => getFallbackData('group', 'findUnique', args),
      findMany: async () => getFallbackData('group', 'findMany'),
      create: async (args) => ({
        id: 'mock-group-' + Date.now(),
        name: args.data?.name || 'Mock Group',
        description: args.data?.description || 'This is a mock group created while database is unavailable',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    
    // Add other models as needed
  };
}

// Get fallback/mock data for different models and operations
function getFallbackData(model, action, args = {}) {
  const mockData = {
    user: {
      findUnique: {
        id: 'mock-user-id',
        name: 'Mock User',
        email: args.where?.email || 'mock@example.com',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      findMany: [
        {
          id: 'mock-user-id-1',
          name: 'Mock User 1',
          email: 'mock1@example.com',
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'mock-user-id-2',
          name: 'Mock User 2',
          email: 'mock2@example.com',
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    group: {
      findUnique: {
        id: args.where?.id || 'mock-group-id',
        name: 'Mock Group',
        description: 'This is a mock group returned when the database is unavailable',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      findMany: [
        {
          id: 'mock-group-id-1',
          name: 'Mock Study Group',
          description: 'A mock study group for algorithm practice',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'mock-group-id-2',
          name: 'Mock Interview Prep',
          description: 'A mock group for interview preparation',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    // Add other models as needed
  };
  
  return mockData[model]?.[action] || null;
}

// Create the Prisma client singleton or reuse the existing one
export const prisma = globalForPrisma.prisma || createPrismaClient();

// Function to explicitly disconnect from the database
export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

// Function to check database connection
export async function checkDatabaseConnection() {
  try {
    // Execute a simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    console.error('Database connection error:', error);
    return { 
      connected: false, 
      error: error.message,
      // Include connection info for debugging
      connectionInfo: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 
        'DATABASE_URL not set',
      usingFallbackMode
    };
  }
}

// Function to check if we're in fallback mode
export function isUsingFallbackMode() {
  return usingFallbackMode;
}

// Only assign to global in development to prevent memory leaks
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 