import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { success: false, message: 'Username is required' },
      { status: 400 }
    );
  }

  const leetcodeApiUrl = `${process.env.LEETCODE_URL}/${username}`;

  try {
    const response = await fetch(leetcodeApiUrl, {
        headers: {
            'Accept': 'application/json',
        }
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        console.error(`LeetCode API error for ${username}:`, errorData);
        // Check if the response is HTML, which indicates a service error page
        if (errorData.trim().startsWith('<!DOCTYPE html>')) {
            return NextResponse.json(
                { success: false, message: 'The LeetCode stats service is currently unavailable. Please try again later.' },
                { status: 503 } // Service Unavailable
            );
        }
        return NextResponse.json(
            { success: false, message: 'Failed to fetch LeetCode stats.' },
            { status: response.status }
        );
    }
    
    const data = await response.json();

    return NextResponse.json({ success: true, stats: data });

  } catch (error) {
    console.error(`Failed to fetch LeetCode stats for ${username}:`, error);
    return NextResponse.json(
      { success: false, message: 'An internal error occurred.' },
      { status: 500 }
    );
  }
} 
