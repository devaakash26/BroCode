const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed process...');

  // Load problems data
  const problemsPath = path.join(__dirname, '..', 'prisma', 'data', 'problems.json');
  if (!fs.existsSync(problemsPath)) {
    console.error('Problems data file not found. Run generateProblems.js first.');
    process.exit(1);
  }

  const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));
  console.log(`Loaded ${problems.length} problems from file.`);

  // Ask for confirmation before deleting existing problems
  console.log('WARNING: This will delete all existing problems, test cases, and submissions.');
  console.log('Press Enter to continue or Ctrl+C to abort.');
  
  // Delete existing data with cascade
  console.log('Deleting existing problems and related data...');
  await prisma.problemCategory.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.problem.deleteMany({});
  console.log('Existing data deleted.');

  // Find or create a system user for the problems
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@neetcode.io' }
  });

  if (!systemUser) {
    console.log('Creating system user...');
    systemUser = await prisma.user.create({
      data: {
        email: 'system@neetcode.io',
        name: 'System',
        role: 'PLATFORM_ADMIN',
      }
    });
  }

  // Find or create categories
  const uniqueCategories = [...new Set(problems.flatMap(p => p.categories))];
  console.log(`Found ${uniqueCategories.length} unique categories.`);

  const categoryMap = {};
  for (const categoryName of uniqueCategories) {
    // Check if category exists
    let category = await prisma.category.findFirst({
      where: { name: categoryName }
    });

    // Create if it doesn't exist
    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName }
      });
      console.log(`Created category: ${categoryName}`);
    }

    categoryMap[categoryName] = category.id;
  }

  // Prepare the database: First create the problems
  console.log('Creating problems in database...');
  let createdCount = 0;

  for (const problem of problems) {
    try {
      // Create the problem
      const createdProblem = await prisma.problem.create({
        data: {
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          constraints: problem.constraints,
          timeComplexity: problem.timeComplexity,
          spaceComplexity: problem.spaceComplexity,
          templateCode: problem.templateCode,
          tags: problem.tags,
          isFeatured: problem.isFeatured,
          isPublic: problem.isPublic,
          creatorId: systemUser.id,
        }
      });

      // Store a simplified version of example test cases in the JSON field
      if (problem.exampleTestCases && problem.exampleTestCases.length > 0) {
        await prisma.problem.update({
          where: { id: createdProblem.id },
          data: {
            testCases: problem.exampleTestCases.map(tc => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              explanation: tc.explanation || null,
              isExample: true
            }))
          }
        });
      }

      // Create test cases in the TestCase model - add both example and evaluation test cases
      // First add example test cases
      if (problem.exampleTestCases && problem.exampleTestCases.length > 0) {
        for (const testCase of problem.exampleTestCases) {
          await prisma.testCase.create({
            data: {
              problemId: createdProblem.id,
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              explanation: testCase.explanation || null,
              isHidden: false,
              isExample: true
            }
          });
        }
      }

      // Then add evaluation test cases
      if (problem.testCases && problem.testCases.length > 0) {
        for (const testCase of problem.testCases) {
          await prisma.testCase.create({
            data: {
              problemId: createdProblem.id,
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              explanation: testCase.explanation || null,
              isHidden: testCase.isHidden || false,
              isExample: false
            }
          });
        }
      }

      // Link categories
      if (problem.categories && problem.categories.length > 0) {
        for (const categoryName of problem.categories) {
          const categoryId = categoryMap[categoryName];
          if (categoryId) {
            await prisma.problemCategory.create({
              data: {
                problemId: createdProblem.id,
                categoryId: categoryId
              }
            });
          }
        }
      }

      createdCount++;
      if (createdCount % 10 === 0) {
        console.log(`Created ${createdCount} problems so far...`);
      }
    } catch (error) {
      console.error(`Error creating problem "${problem.title}":`, error);
    }
  }

  console.log(`Database seed completed. Created ${createdCount} new problems.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
