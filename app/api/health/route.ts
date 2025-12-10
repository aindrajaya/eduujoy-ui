/**
 * Diagnostic Endpoint: Check API Health and Cache Status
 */

import { NextRequest, NextResponse } from 'next/server';

// We need to import the cache from the main callback route
// For now, we'll create a simple health check

export async function GET(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    
    return NextResponse.json(
      {
        status: 'healthy',
        endpoint: '/api/learning-callback',
        message: 'API is running',
        timestamp,
        instructions: {
          webhook_url: 'https://your-vercel-domain.vercel.app/api/learning-callback',
          method: 'POST',
          expected_body: {
            email: 'user@example.com',
            learningData: {
              profile_summary: {},
              learning_path: [],
              action_plan: {},
              pro_tips: []
            }
          },
          query_params: {
            dataId: 'user@example.com'
          }
        },
        troubleshooting: {
          '404_on_get': 'Data not received from n8n yet. Check if n8n webhook has been triggered.',
          '404_endpoint_not_found': 'Make sure Vercel deployment includes the /api/learning-callback route',
          'no_data': 'n8n may not have POSTed to the callback URL. Verify n8n HTTP request node configuration.'
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Diagnostic endpoint error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
