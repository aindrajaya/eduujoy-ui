/**
 * Webhook Callback: Receive Generated Learning Plan from n8n
 * 
 * n8n will POST the generated learning data to this endpoint
 * This endpoint stores the data temporarily and makes it available to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for learning data (replace with database in production)
const learningDataCache: Map<string, { data: any; timestamp: number }> = new Map();

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION = 30 * 60 * 1000;

/**
 * Transform n8n response format to app format
 */
function transformN8nData(n8nData: any) {
  const data = Array.isArray(n8nData) ? n8nData[0] : n8nData;
  
  if (!data || !data.learningData) {
    throw new Error('Invalid data structure from n8n');
  }

  const learningData = data.learningData;

  // Transform learning_path to match app format
  const learning_path = (learningData.learning_path || []).map((module: any, index: number) => ({
    module_number: index + 1,
    module_title: module.title || '',
    duration: module.duration || '',
    objective: module.objective || '',
    resources: (module.resources || []).map((resource: any) => ({
      type: resource.type || '',
      name: resource.title || resource.name || '',
      link: resource.link || '#',
      duration_estimate: resource.duration || resource.duration_estimate || '',
      rationale: resource.description || ''
    }))
  }));

  // Transform action_plan
  const action_plan = {
    quick_start: learningData.action_plan?.steps?.[0]?.description || 'Begin with Module 1 this week.',
    daily_routine: learningData.action_plan?.steps?.[1]?.description || 'Dedicate time each day to learning.',
    progress_tracking: learningData.action_plan?.steps?.[2]?.description || 'Keep track of your progress.'
  };

  // Transform pro_tips
  const pro_tips = (learningData.pro_tips || []).map((tip: any) => {
    if (typeof tip === 'string') {
      return tip;
    }
    return `<strong>${tip.title}:</strong> ${tip.description}`;
  });

  return {
    email: data.email,
    profile_summary: learningData.profile_summary,
    learning_path,
    action_plan,
    pro_tips,
    expected_timeline: learningData.expected_timeline
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse the learning data from n8n
    const body = await request.json();
    
    console.log('📥 Webhook received from n8n');
    console.log('Request body keys:', Object.keys(body));

    // Handle both single object and array response
    let n8nData = body;
    if (Array.isArray(body) && body.length > 0) {
      n8nData = body[0];
    }

    console.log('Processing data for email:', n8nData.email);

    // Transform and validate the data
    const learningData = transformN8nData(Array.isArray(body) ? body : [n8nData]);

    // Validate that we have required fields
    if (!learningData || !learningData.learning_path || learningData.learning_path.length === 0) {
      console.error('❌ Invalid learning data structure');
      console.error('Received data:', JSON.stringify(learningData, null, 2));
      return NextResponse.json(
        { error: 'Invalid learning data structure - no learning_path found' },
        { status: 400 }
      );
    }

    // Use email as key if available, otherwise generate ID
    const dataId = learningData.email || `learning-${Date.now()}`;

    // Store the transformed data with timestamp
    learningDataCache.set(dataId, {
      data: learningData,
      timestamp: Date.now(),
    });

    console.log(`✅ Learning data stored for: ${dataId}`);
    console.log(`📊 Modules received: ${learningData.learning_path.length}`);
    console.log(`💾 Cache size: ${learningDataCache.size} items`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Learning plan received successfully',
        dataId: dataId,
        timestamp: new Date().toISOString(),
        modulesCount: learningData.learning_path.length,
        cacheSize: learningDataCache.size
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Webhook callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Failed to process learning data', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve stored learning data
 * Frontend can call this endpoint to get the generated learning plan
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

    console.log(`✅ Retrieved learning data for: ${dataId}`);
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
    console.log(`🗑️  Learning data cleared for: ${dataId}`);

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
