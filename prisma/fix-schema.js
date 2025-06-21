/**
 * This script helps to fix Prisma schema and apply migrations when you're facing permission issues.
 * It's a workaround for EPERM issues on Windows.
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Path to the Prisma schema file
const schemaPath = path.join(__dirname, 'schema.prisma');

// Read the schema file
let schema;
try {
  schema = fs.readFileSync(schemaPath, 'utf8');
  console.log('Successfully read schema file');
} catch (error) {
  console.error('Error reading schema file:', error);
  process.exit(1);
}

// Check if the Challenge model needs updates
if (!schema.includes('model Challenge {')) {
  console.log('Challenge model not found in schema');
  process.exit(0);
}

// Add creatorId field to Challenge model if it doesn't exist
if (!schema.includes('creatorId      String') && schema.includes('model Challenge {')) {
  console.log('Adding creatorId field to Challenge model...');
  
  // Find the Challenge model and add the creatorId field
  schema = schema.replace(
    /model Challenge {[^}]*?(\s+id\s+String\s+@id\s+@default\(cuid\))/,
    'model Challenge {\n  $1\n  creatorId      String'
  );
  
  // Find the Challenge relations and add the creator relation
  schema = schema.replace(
    /\/\/ Relations(\s+)group(\s+)Group(\s+)@relation/,
    '// Relations$1group          Group    @relation$1creator        User     @relation("ChallengeCreator", fields: [creatorId], references: [id])'
  );
  
  // Add the relation to the User model
  schema = schema.replace(
    /groupsCreated Group\[\](\s+)@relation\("GroupCreator"\)/,
    'groupsCreated Group[]     @relation("GroupCreator")$1challengesCreated Challenge[] @relation("ChallengeCreator")'
  );
  
  // Write the updated schema back to the file
  try {
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('Successfully updated schema file');
  } catch (error) {
    console.error('Error writing schema file:', error);
    process.exit(1);
  }
}

// Create a migration file
const migrationDir = path.join(__dirname, 'migrations', 'manual');
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir, { recursive: true });
}

const migrationContent = `-- AddChallengeCreator
ALTER TABLE IF NOT EXISTS "Challenge" ADD COLUMN IF NOT EXISTS "creatorId" TEXT;
UPDATE "Challenge" SET "creatorId" = (SELECT id FROM "User" LIMIT 1) WHERE "creatorId" IS NULL;
ALTER TABLE "Challenge" ALTER COLUMN "creatorId" SET NOT NULL;
ALTER TABLE "Challenge" ADD CONSTRAINT IF NOT EXISTS "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;

const migrationPath = path.join(migrationDir, 'add_challenge_creator.sql');
try {
  fs.writeFileSync(migrationPath, migrationContent, 'utf8');
  console.log('Created migration file:', migrationPath);
} catch (error) {
  console.error('Error creating migration file:', error);
}

console.log('Schema fix completed. Now try running your app again.');
console.log('If you still have issues, you may need to manually run SQL queries in your database.'); 
