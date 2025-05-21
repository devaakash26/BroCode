# DSA Problem Generator and Database Seeding

This directory contains scripts to generate and seed DSA (Data Structures and Algorithms) problems into the database.

## Scripts Overview

1. `generateProblems.js` - Generates 100+ DSA problems in JSON format
2. `seedProblems.js` - Seeds the generated problems into the database

## Problem Structure

Each problem includes:
- Title
- Detailed description
- Difficulty level (EASY, MEDIUM, HARD)
- Time and space complexity constraints
- 30+ test cases (from easy to difficult)
- Template code in multiple languages
- Tags and categories for organization

## Usage Instructions

### Step 1: Generate Problems

Run the problem generator script:

```bash
node scripts/generateProblems.js
```

This will create a JSON file with 100+ DSA problems at `prisma/data/problems.json`.

### Step 2: Seed the Database

After generating the problems, seed them into the database:

```bash
node scripts/seedProblems.js
```

This script will:
1. Create a system user if one doesn't exist
2. Create all necessary categories
3. Add problems with their test cases to the database
4. Link problems to their appropriate categories

## Customization

To customize the problems:
- Edit the problem templates in `generateProblems.js`
- Add new categories or problem types
- Modify difficulty distribution
- Change the number of test cases generated

## Notes

- The seeding script is idempotent - it won't create duplicate problems if run multiple times
- Problems are linked to a "system" user - make sure this account exists or will be created
- Test cases are stored both in the JSON field and as separate TestCase entities 