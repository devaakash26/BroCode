import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma, disconnectPrisma } from "@/app/lib/db";
import { redisHelpers } from "@/lib/redis";

// GET handler for fetching a single problem with all details
export async function GET(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const problemId = params.id;

    // Fetch the problem with all related data
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        categories: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        testCases: {
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            explanation: true,
            isHidden: true,
          },
        },
      },
    });

    if (!problem) {
      return NextResponse.json(
        { success: false, error: "Problem not found" },
        { status: 404 },
      );
    }

    // Format the problem data for return
    const formattedProblem = {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      exampleInput: problem.exampleInput,
      exampleOutput: problem.exampleOutput,
      constraints: problem.constraints,
      solution: problem.solution,
      timeComplexity: problem.timeComplexity,
      spaceComplexity: problem.spaceComplexity,
      templateCode: problem.templateCode,
      tags: problem.tags,
      categories: problem.categories.map((c) => c.category.name),
      testCases: problem.testCases,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };

    return NextResponse.json({ success: true, problem: formattedProblem });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch problem: ${error.message}`,
      },
      { status: 500 },
    );
  } finally {
    await disconnectPrisma();
  }
}

// PUT handler for updating a problem
export async function PUT(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const problemId = params.id;

    // Parse request body
    let data;
    try {
      data = await request.json();
      console.log("Received update data:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error parsing request body:", err);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid JSON in request body: ${err.message}`,
        },
        { status: 400 },
      );
    }

    // Validate input data
    if (!data.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }

    if (!data.description) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 },
      );
    }

    if (
      !data.difficulty ||
      !["EASY", "MEDIUM", "HARD"].includes(data.difficulty)
    ) {
      return NextResponse.json(
        { success: false, error: "Valid difficulty is required" },
        { status: 400 },
      );
    }

    if (
      !data.categories ||
      !Array.isArray(data.categories) ||
      data.categories.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "At least one category is required" },
        { status: 400 },
      );
    }

    console.log(
      "Updating problem with template code:",
      JSON.stringify(data.templateCode, null, 2),
    );

    // Update the problem in a transaction
    const result = await prisma.$transaction(async (tx) => {
      try {
        // Handle templateCode
        let templateCodeJson = {};
        if (data.templateCode) {
          if (typeof data.templateCode === "string") {
            try {
              templateCodeJson = JSON.parse(data.templateCode);
            } catch (e) {
              console.error("Invalid templateCode JSON:", e);
              templateCodeJson = {};
            }
          } else if (typeof data.templateCode === "object") {
            templateCodeJson = data.templateCode;
          }
        }

        // Update the problem
        const problem = await tx.problem.update({
          where: { id: problemId },
          data: {
            title: data.title,
            description: data.description,
            difficulty: data.difficulty,
            exampleInput: data.exampleInput || "",
            exampleOutput: data.exampleOutput || "",
            constraints: data.constraints || "",
            solution: data.solution || "",
            timeComplexity: data.timeComplexity || "O(n)",
            spaceComplexity: data.spaceComplexity || "O(n)",
            templateCode: templateCodeJson,
            tags: data.tags || [],
          },
        });

        // Delete existing category relationships
        await tx.problemCategory.deleteMany({
          where: { problemId: problemId },
        });

        // Add new categories
        for (const categoryName of data.categories) {
          const category = await tx.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });

          await tx.problemCategory.create({
            data: {
              problemId: problem.id,
              categoryId: category.id,
            },
          });
        }

        // Delete existing test cases
        await tx.testCase.deleteMany({
          where: { problemId: problemId },
        });

        // Create new test cases if provided
        if (
          data.testCases &&
          Array.isArray(data.testCases) &&
          data.testCases.length > 0
        ) {
          await tx.testCase.createMany({
            data: data.testCases.map((tc) => ({
              problemId: problem.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              explanation: tc.explanation || "",
              isHidden: tc.isHidden || false,
            })),
          });
        }

        return problem;
      } catch (error) {
        console.error("Error in transaction:", error);
        throw error;
      }
    });

    // Invalidate problems cache after update
    await redisHelpers.invalidateAllProblems();

    return NextResponse.json({
      success: true,
      message: "Problem updated successfully",
      problemId: result.id,
    });
  } catch (error) {
    console.error("Error updating problem:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to update problem: ${error.message}`,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  } finally {
    await disconnectPrisma();
  }
}
