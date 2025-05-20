import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';

export async function POST(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('profileImage');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'File type not supported. Please upload an image file (JPEG, PNG, GIF).' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size too large. Please upload an image less than 5MB.' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueId = nanoid(10);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${session.user.id}-${uniqueId}.${fileExtension}`;
    
    // Define the path where the file will be saved
    const publicDirectory = join(process.cwd(), 'public');
    const uploadsDirectory = join(publicDirectory, 'uploads');
    const filePath = join(uploadsDirectory, fileName);
    
    // Create directories if they don't exist
    try {
      await writeFile(filePath, buffer);
    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json(
        { success: false, message: 'Error saving file' },
        { status: 500 }
      );
    }

    // Generate URL for the uploaded image
    const imageUrl = `/uploads/${fileName}`;

    // Update the user's profile image
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        image: imageUrl,
      },
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Profile image updated',
      imageUrl,
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { success: false, message: 'Error uploading profile image' },
      { status: 500 }
    );
  }
} 