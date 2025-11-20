/**
 * API Route: Generate Learning Data from n8n
 * 
 * This endpoint:
 * 1. Receives form data from the onboarding form
 * 2. Sends it to n8n webhook for AI processing
 * 3. Returns the generated learning data
 */

import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'https://n8n-oo1yqkmi2l7g.blueberry.sumopod.my.id/webhook/826acb2a-ac8d-496e-828e-1c0791d1446d';

export async function POST(request: NextRequest) {
  try {
    // Parse incoming form data
    const formData = await request.json();

    // Validate required fields
    if (!formData.email || !formData.learningGoals) {
      return NextResponse.json(
        { error: 'Missing required fields: email, learningGoals' },
        { status: 400 }
      );
    }

    // Forward the request to n8n webhook
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!n8nResponse.ok) {
      console.error(`n8n webhook error: ${n8nResponse.status}`);
      return NextResponse.json(
        { error: `n8n webhook failed with status ${n8nResponse.status}` },
        { status: n8nResponse.status }
      );
    }

    // Parse the response from n8n
    const learningData = await n8nResponse.json();

    // Return the learning data
    return NextResponse.json(learningData, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate learning data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
