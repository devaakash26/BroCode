import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { emailVerified: true, id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get current date for comparison
    const currentDate = new Date();
    
    // In case the emailVerified is a date string with a future date (like the reported issue)
    let isVerified = false;
    let verificationDate = user.emailVerified;
    
    if (user.emailVerified) {
      // Try to parse the date, regardless of format
      const verifiedDate = new Date(user.emailVerified);
      
      // Check if the date is valid
      if (verifiedDate instanceof Date && !isNaN(verifiedDate)) {
        // If date is in the future (more than 5 minutes ahead), fix it
        if (verifiedDate > new Date(currentDate.getTime() + 5 * 60 * 1000)) {
          console.warn("Future verification date detected:", user.emailVerified);
          
          // Fix by setting to current date
          const fixedDate = currentDate.toISOString();
          
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: fixedDate },
          });
          
          verificationDate = fixedDate;
        }
        
        // User is verified if they have any valid date (past or present)
        isVerified = true;
      } else {
        console.warn("Invalid verification date format:", user.emailVerified);
        
        // If completely invalid, fix it
        const fixedDate = currentDate.toISOString();
        
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: fixedDate },
        });
        
        verificationDate = fixedDate;
        isVerified = true;
      }
    }

    return NextResponse.json({
      success: true,
      isVerified: isVerified,
      verificationDate: verificationDate,
      currentServerTime: currentDate.toISOString(),
    });
  } catch (error) {
    console.error('Verification status check error:', error);
    return NextResponse.json(
      { success: false, message: 'Error checking verification status' },
      { status: 500 }
    );
  }
} 
