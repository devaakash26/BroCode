import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';
import { nanoid } from 'nanoid';
import { saveFileLocally } from '@/app/lib/fileUpload';

export async function POST(request) {
  try {
    // Get session to check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'You must be logged in to create a group' },
        { status: 401 }
      );
    }

    // Check if the request is a multipart form data request
    const contentType = request.headers.get('content-type') || '';
    let groupData;
    let imageFile = null;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data with file upload
      const formData = await request.formData();
      
      // Extract the form fields
      groupData = {
        name: formData.get('name'),
        description: formData.get('description'),
        visibility: formData.get('visibility'),
        memberLimit: formData.get('memberLimit'),
      };
      
      // Get the image file if provided
      imageFile = formData.get('imageFile');
    } else {
      // Handle JSON request (fallback)
      groupData = await request.json();
    }
    
    // Validate input
    if (!groupData.name || groupData.name.trim().length < 3) {
      return NextResponse.json(
        { message: 'Group name must be at least 3 characters long' },
        { status: 400 }
      );
    }
    
    if (groupData.name.trim().length > 50) {
      return NextResponse.json(
        { message: 'Group name must be less than 50 characters' },
        { status: 400 }
      );
    }
    
    if (groupData.description && groupData.description.trim().length > 500) {
      return NextResponse.json(
        { message: 'Description must be less than 500 characters' },
        { status: 400 }
      );
    }
    
    // Validate visibility
    const validVisibilities = ['PUBLIC', 'PRIVATE', 'UNLISTED'];
    if (!validVisibilities.includes(groupData.visibility)) {
      return NextResponse.json(
        { message: 'Invalid visibility option' },
        { status: 400 }
      );
    }
    
    // Validate member limit
    let memberLimit = null;
    if (groupData.memberLimit !== null && groupData.memberLimit !== undefined && groupData.memberLimit !== '') {
      const limit = parseInt(groupData.memberLimit);
      if (isNaN(limit) || limit < 2 || limit > 1000) {
        return NextResponse.json(
          { message: 'Member limit must be between 2 and 1000' },
          { status: 400 }
        );
      }
      memberLimit = limit;
    }
    
    // Generate a unique invite code (8 characters)
    const inviteCode = nanoid(8);
    
    // Create the base URL for invite links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Create the invite link
    const inviteLink = `${baseUrl}/groups/join?code=${inviteCode}`;
    
    // Process image file if provided
    let imageUrl = groupData.image || null; // Default to image URL if provided
    
    if (imageFile && imageFile instanceof File) {
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
          return NextResponse.json(
            { message: 'Invalid image format. Please use JPEG, PNG, GIF, or WebP.' },
            { status: 400 }
          );
        }
        
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (imageFile.size > maxSize) {
          return NextResponse.json(
            { message: 'Image too large. Maximum size is 5MB.' },
            { status: 400 }
          );
        }
        
        // Read file data
        const imageBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);
        
        // Save the file using our utility
        const result = await saveFileLocally(buffer, {
          folder: 'groups',
          filename: imageFile.name || `group_${inviteCode}.jpg`
        });
        
        // Use the stored image URL
        if (result && result.secure_url) {
          imageUrl = result.secure_url;
        }
      } catch (error) {
        console.error('Error processing image upload:', error);
        // We'll continue with group creation but without the image
      }
    }
    
    // Create group in database with the invite link
    const group = await prisma.group.create({
      data: {
        name: groupData.name.trim(),
        description: groupData.description ? groupData.description.trim() : null,
        inviteCode,
        inviteLink,
        visibility: groupData.visibility,
        memberLimit,
        image: imageUrl,
        creatorId: session.user.id,
        currentMembers: 1, // Start with creator as the first member
        // Create the creator as the first member with ADMIN role
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          }
        }
      },
    });
    
    // Return the created group data
    return NextResponse.json({
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      inviteLink: group.inviteLink,
      image: group.image,
      message: 'Group created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Group creation error:', error);
    return NextResponse.json(
      { message: 'Failed to create group', error: error.message },
      { status: 500 }
    );
  }
} 