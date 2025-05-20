/*
  Warnings:

  - You are about to drop the column `output` on the `TestCase` table. All the data in the column will be lost.
  - Added the required column `expectedOutput` to the `TestCase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "constraints" TEXT,
ADD COLUMN     "exampleInput" TEXT,
ADD COLUMN     "exampleOutput" TEXT,
ADD COLUMN     "solution" TEXT,
ADD COLUMN     "spaceComplexity" TEXT,
ADD COLUMN     "templateCode" JSONB,
ADD COLUMN     "timeComplexity" TEXT;

-- AlterTable
ALTER TABLE "TestCase" DROP COLUMN "output",
ADD COLUMN     "expectedOutput" TEXT NOT NULL,
ADD COLUMN     "explanation" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemCategory" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProblemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemCategory_problemId_categoryId_key" ON "ProblemCategory"("problemId", "categoryId");

-- AddForeignKey
ALTER TABLE "ProblemCategory" ADD CONSTRAINT "ProblemCategory_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemCategory" ADD CONSTRAINT "ProblemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
