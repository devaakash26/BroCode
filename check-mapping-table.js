const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMappingTable() {
  try {
    // Check if Tag table exists
    const tagCount = await prisma.tag.count();
    console.log(`✅ Tag table exists with ${tagCount} records`);
    
    // Check if CodingQuestionTagMapping table exists
    const mappingCount = await prisma.codingQuestionTagMapping.count();
    console.log(`✅ CodingQuestionTagMapping table exists with ${mappingCount} records`);
    
    // Show some sample data if exists
    if (tagCount > 0) {
      const tags = await prisma.tag.findMany({ take: 5 });
      console.log('\nSample tags:');
      tags.forEach(tag => {
        console.log(`  - ${tag.name} (${tag.slug})`);
      });
    }
    
    if (mappingCount > 0) {
      const mappings = await prisma.codingQuestionTagMapping.findMany({
        take: 5,
        include: {
          problem: { select: { title: true } },
          tag: { select: { name: true } }
        }
      });
      console.log('\nSample mappings:');
      mappings.forEach(m => {
        console.log(`  - ${m.problem.title} → ${m.tag.name}`);
      });
    }
    
  } catch (error) {
    if (error.code === 'P2021') {
      console.log('❌ Tables do not exist in database yet');
      console.log('   Run: npx prisma migrate dev --name add_tag_mapping_tables');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkMappingTable();
