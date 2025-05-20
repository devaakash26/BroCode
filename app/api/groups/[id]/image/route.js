import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma, disconnectPrisma } from '@/app/lib/db';
import { saveFileLocally } from '@/app/lib/fileUpload';

export async function POST(request, { params }) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;

    // Check if user has permission to update group
    const userGroup = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: groupId,
        },
      },
      include: {
        group: {
          select: {
            creatorId: true
          }
        }
      }
    });

    // Check if user is admin or creator
    const isCreator = userGroup?.group?.creatorId === session.user.id;
    const isAdmin = userGroup?.role === 'ADMIN';

    if (!userGroup || (!isAdmin && !isCreator)) {
      return NextResponse.json({ 
        success: false, 
        error: 'You do not have permission to update this group' 
      }, { status: 403 });
    }

    // Parse form data for image
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Upload image to local storage
    const imageFile = await image.arrayBuffer();
    const buffer = Buffer.from(imageFile);
    
    const originalFilename = image.name || `group_${groupId}.jpg`;
    
    const result = await saveFileLocally(buffer, {
      folder: 'groups',
      filename: originalFilename
    });

    if (!result || !result.secure_url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload image' 
      }, { status: 500 });
    }

    // Update group with new image URL
    await prisma.group.update({
      where: { id: groupId },
      data: { image: result.secure_url }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Group image updated successfully',
      imageUrl: result.secure_url
    });
  } catch (error) {
    console.error('Error updating group image:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update group image' 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 