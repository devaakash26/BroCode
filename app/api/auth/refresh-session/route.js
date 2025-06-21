import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { authOptions } from "../[...nextauth]/route";

export async function GET(request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Get fresh user data from the database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Return the updated user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json(
      { success: false, message: "Error refreshing session" },
      { status: 500 }
    );
  }
} 
