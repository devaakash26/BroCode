const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting duplicate problems cleanup process...');

  // 1. Find all problems, grouped by title
  console.log('Finding duplicate problems...');
  const duplicateProblems = await prisma.$queryRaw`
    SELECT title, COUNT(*) as count, ARRAY_AGG(id) as ids
    FROM "Problem"
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  if (duplicateProblems.length === 0) {
    console.log('No duplicate problems found. Your database is clean!');
    return;
  }

  console.log(`Found ${duplicateProblems.length} duplicate problem titles.`);
  
  let dryRun = !process.argv.includes('--execute');
  if (dryRun) {
    console.log('DRY RUN MODE: No changes will be made to the database.');
    console.log('Run with --execute flag to perform actual deletion.');
  } else {
    console.log('EXECUTE MODE: Duplicates will be permanently removed from the database.');
    console.log('Press Enter to continue or Ctrl+C to abort.');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  // Display duplicates
  for (const dup of duplicateProblems) {
    console.log(`\n"${dup.title}" appears ${dup.count} times`);
    console.log(`IDs: ${dup.ids.join(', ')}`);
    
    if (!dryRun) {
      console.log('Cleaning up duplicates...');
      
      // Keep the first occurrence and delete the rest
      const [keepId, ...deleteIds] = dup.ids;
      console.log(`Keeping: ${keepId}`);
      console.log(`Removing: ${deleteIds.join(', ')}`);
      
      try {
        // First remove related records - This might be handled by the cascade deletion in schema,
        // but we'll do it explicitly for safety
        await prisma.problemCategory.deleteMany({
          where: { problemId: { in: deleteIds } }
        });
        
        await prisma.testCase.deleteMany({
          where: { problemId: { in: deleteIds } }
        });
        
        await prisma.submission.deleteMany({
          where: { problemId: { in: deleteIds } }
        });
        
        await prisma.challengeProblems.deleteMany({
          where: { problemId: { in: deleteIds } }
        });
        
        // Finally, delete the duplicate problems
        const result = await prisma.problem.deleteMany({
          where: { id: { in: deleteIds } }
        });
        
        console.log(`Deleted ${result.count} duplicate problems`);
      } catch (error) {
        console.error(`Error deleting duplicates for "${dup.title}":`, error);
      }
    }
  }

  const message = dryRun 
    ? '\nDRY RUN COMPLETED. To execute deletion, run again with --execute flag.'
    : '\nDuplicates removal completed successfully!';
    
  console.log(message);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
