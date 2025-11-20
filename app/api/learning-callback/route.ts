/**
 * Webhook Callback: Receive Generated Learning Plan from n8n
 * 
 * n8n will POST the generated learning data to this endpoint
 * This endpoint stores the data persistently and makes it available to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeDataWithFallback, getDataWithFallback, deleteDataWithFallback } from '@/lib/learningDataStore';

/**
 * Transform n8n response format to app format
 */
function transformN8nData(n8nData: any) {
  console.log('🔄 Transforming n8n data:', JSON.stringify(n8nData, null, 2).substring(0, 1000));

  const data = Array.isArray(n8nData) ? n8nData[0] : n8nData;
  console.log('📊 Data after array check:', JSON.stringify(data, null, 2).substring(0, 500));
  console.log('📧 data.email:', data.email);
  
  if (!data || !data.learningData) {
    console.error('❌ Missing learningData in n8n response');
    throw new Error('Invalid data structure from n8n');
  }

  const learningData = data.learningData;
  console.log('📊 Learning data keys:', Object.keys(learningData));

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

  const transformed = {
    email: data.email,
    profile_summary: learningData.profile_summary,
    learning_path,
    action_plan,
    pro_tips,
    expected_timeline: learningData.expected_timeline
  };

  console.log('✅ Transformed data keys:', Object.keys(transformed));
  console.log('📊 Transformed learning path length:', transformed.learning_path.length);

  return transformed;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the learning data from n8n
    const body = await request.json();

    console.log('📥 Webhook received from n8n');
    console.log('Request body keys:', Object.keys(body));

    // Handle n8n's HTTP Request node format - extract actual data from "body" property
    let actualData = body;
    if (body.body) {
      console.log('🔄 Extracting data from n8n "body" property');
      console.log('📊 Body content type:', typeof body.body);
      console.log('📊 Body keys:', Object.keys(body.body));
      actualData = body.body;
    }

    // Handle both single object and array response
    let n8nData = actualData;
    if (Array.isArray(actualData) && actualData.length > 0) {
      n8nData = actualData[0];
    }

    console.log('Processing data for email:', n8nData.email);
    console.log('Raw n8nData keys:', Object.keys(n8nData));
    console.log('Raw n8nData.email:', n8nData.email);

    // Transform and validate the data
    const learningData = transformN8nData(Array.isArray(actualData) ? actualData : [n8nData]);

    console.log('Transformed learningData.email:', learningData.email);

    // Validate that we have required fields
    if (!learningData || !learningData.learning_path || learningData.learning_path.length === 0) {
      console.error('❌ Invalid learning data structure');
      console.error('Received data:', JSON.stringify(learningData, null, 2));
      return NextResponse.json(
        { error: 'Invalid learning data structure - no learning_path found' },
        { status: 400 }
      );
    }

    // Validate email
    if (!learningData.email || typeof learningData.email !== 'string' || !learningData.email.includes('@')) {
      console.error('❌ Invalid or missing email:', learningData.email);
      return NextResponse.json(
        { error: 'Invalid or missing email address' },
        { status: 400 }
      );
    }

    // Resolve canonical email (dataId) from multiple possible sources.
    // n8n and various callers may place the email in different locations,
    // so check several places and prefer the first valid one.
    const candidateEmails = [
      learningData?.email,
      n8nData?.email,
      n8nData?.learningData?.email,
      learningData?.profile_summary?.email,
      learningData?.profile_summary?.contact_email,
    ].filter((v) => typeof v === 'string' && v.length > 0);

    const dataId = candidateEmails.length > 0 ? candidateEmails[0] : `learning-${Date.now()}`;
    console.log('Resolved dataId/email candidates:', candidateEmails, '->', dataId);

    // Store the transformed data (with disk + memory fallback)
    await storeDataWithFallback(dataId, learningData);

    console.log(`✅ Learning data stored for: ${dataId}`);
    console.log(`📊 Modules received: ${learningData.learning_path.length}`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Learning plan received successfully',
        dataId: dataId,
        timestamp: new Date().toISOString(),
        modulesCount: learningData.learning_path.length
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
    const data = await getDataWithFallback(dataId);

    if (!data) {
      return NextResponse.json(
        { error: 'Learning data not found. Please wait for n8n to process your request.' },
        { status: 404 }
      );
    }

    console.log(`✅ Retrieved learning data for: ${dataId}`);
    return NextResponse.json(data, { status: 200 });
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

    await deleteDataWithFallback(dataId);

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
