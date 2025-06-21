import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { uploadToCloudinary } from '@/app/lib/fileUpload';
import { v4 as uuidv4 } from 'uuid';

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
    const imageFile = formData.get('image');

    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Read file into buffer
    const imageBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Generate a unique identifier for the image
    const public_id = `group_${groupId}_${uuidv4()}`;
    
    // Upload image to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      folder: `groups/${groupId}`, // Organize uploads by group
      public_id: public_id,
    });

    if (!result || !result.secure_url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload image to Cloudinary' 
      }, { status: 500 });
    }

    // Update group with new image URL
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { image: result.secure_url }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Group image updated successfully',
      imageUrl: updatedGroup.image
    });
  } catch (error) {
    console.error('Error updating group image:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update group image' 
    }, { status: 500 });
  }
} 