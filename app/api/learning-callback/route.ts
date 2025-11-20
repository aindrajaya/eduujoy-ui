/**
 * Webhook Callback: Receive Generated Learning Plan from n8n
 * 
 * n8n will POST the generated learning data to this endpoint
 * This endpoint stores the data temporarily and makes it available to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for learning data (replace with database in production)
const learningDataCache: Map<string, { data: any; timestamp: number }> = new Map();

// Cache expiration time (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    // Parse the learning data from n8n
    const learningData = await request.json();

    // Validate that we have required fields
    if (!learningData || !learningData.learning_path) {
      return NextResponse.json(
        { error: 'Invalid learning data structure' },
        { status: 400 }
      );
    }

    // Generate a unique ID for this learning plan (use email as key if available)
    const dataId = learningData.email || `learning-${Date.now()}`;

    // Store the data with timestamp
    learningDataCache.set(dataId, {
      data: learningData,
      timestamp: Date.now(),
    });

    console.log(`✅ Received learning data for: ${dataId}`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Learning plan received successfully',
        dataId: dataId,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Webhook callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process learning data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve stored learning data
 * Frontend can poll this endpoint to get the generated learning plan
 */
export async function GET(request: NextRequest) {
  try {
    // Get dataId from query parameter
    const dataId = request.nextUrl.searchParams.get('dataId');

    if (!dataId) {
      return NextResponse.json(
        { error: 'Missing dataId parameter' },
        { status: 400 }
      );
    }

    // Check if data exists and is not expired
    const cached = learningDataCache.get(dataId);

    if (!cached) {
      return NextResponse.json(
        { error: 'Learning data not found. Please wait for n8n to process your request.' },
        { status: 404 }
      );
    }

    // Check if data has expired
    if (Date.now() - cached.timestamp > CACHE_EXPIRATION) {
      learningDataCache.delete(dataId);
      return NextResponse.json(
        { error: 'Learning data has expired' },
        { status: 410 }
      );
    }

    // Return the learning data
    return NextResponse.json(cached.data, { status: 200 });
  } catch (error) {
    console.error('❌ GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve learning data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Clear stored learning data (optional cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const dataId = request.nextUrl.searchParams.get('dataId');

    if (!dataId) {
      return NextResponse.json(
        { error: 'Missing dataId parameter' },
        { status: 400 }
      );
    }

    learningDataCache.delete(dataId);

    return NextResponse.json(
      { success: true, message: 'Learning data cleared' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete learning data' },
      { status: 500 }
    );
  }
}
