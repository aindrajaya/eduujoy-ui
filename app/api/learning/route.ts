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
const EXTRA_N8N_WEBHOOK = 'https://n8n-oo1yqkmi2l7g.blueberry.sumopod.my.id/webhook/73928a59-c6df-4fc6-b06d-ef0c7f02481a';

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

    // Forward the request to the default n8n webhook and also send the same payload
    // to the extra webhook. The app will use the default webhook's response, while
    // the extra webhook is invoked asynchronously (errors are logged but don't block).
    const defaultResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    // Fire-and-forget the extra webhook; catch errors to avoid unhandled rejections.
    fetch(EXTRA_N8N_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }).then(res => {
      if (!res.ok) console.warn(`Extra n8n webhook returned status ${res.status}`);
    }).catch(err => console.warn('Extra n8n webhook error:', err));

    if (!defaultResponse.ok) {
      console.error(`n8n webhook error: ${defaultResponse.status}`);
      return NextResponse.json(
        { error: `n8n webhook failed with status ${defaultResponse.status}` },
        { status: defaultResponse.status }
      );
    }

    // Parse the response from the default n8n
    const learningData = await defaultResponse.json();

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
