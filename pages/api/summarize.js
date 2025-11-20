/**
 * API endpoint to summarize transcript using Gemini API
 * POST /api/summarize
 *
 * Request body:
 * {
 *   videoId: string,
 *   transcript: string,
 *   title: string,
 *   videoUrl: string
 * }
 */
import { cache } from '@/lib/cache';
import { generateCacheKey } from '@/lib/videoUtils';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_TRANSCRIPT_CHARS = parseInt(process.env.MAX_TRANSCRIPT_CHARS || '120000', 10);
const CACHE_TTL_SEC = parseInt(process.env.SUMMARY_CACHE_TTL_SEC || '86400', 10);
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

/**
 * Validate environment variables
 */
function validateEnv() {
  const errors = [];

  if (!GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY is not set in environment variables');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return { valid: true };
}

/**
 * Truncate transcript to safe length for API
 * @param {string} transcript - Full transcript
 * @param {number} maxChars - Max characters
 * @returns {object} { transcript, isTruncated }
 */
function truncateTranscript(transcript, maxChars = MAX_TRANSCRIPT_CHARS) {
  if (!transcript || transcript.length <= maxChars) {
    return { transcript, isTruncated: false };
  }

  // Try to truncate at a sentence boundary
  const truncated = transcript.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');

  return {
    transcript: lastPeriod > maxChars * 0.9 ? truncated.substring(0, lastPeriod + 1) : truncated,
    isTruncated: true,
  };
}

/**
 * Build system and user prompts for Gemini
 */
function buildPrompt(title, content, videoUrl, contentType = 'transcript') {
  let systemPrompt = '';
  let userPrompt = '';

  if (contentType === 'transcript') {
    systemPrompt = `You are an expert learning assistant. Analyze the provided video transcript and return a JSON object with these exact keys:
- summary: A 3-4 sentence summary of the main concepts
- takeaways: An array of 5 key takeaways (bullet points)
- actions: An array of 2-3 suggested action items for the learner

Respond with ONLY a valid JSON object, no additional text or markdown.`;

    userPrompt = `Video Title: "${title}"
URL: ${videoUrl}

Transcript:
${content}`;
  } else if (contentType === 'metadata') {
    systemPrompt = `You are an expert learning assistant. Based on the video title and description provided, create an educational summary as if you were analyzing the actual video content. Return a JSON object with these exact keys:
- summary: A 3-4 sentence summary of what this video likely covers based on the title and description
- takeaways: An array of 5 key takeaways you would expect from this type of educational content
- actions: An array of 2-3 suggested action items for the learner

Since you don't have the actual transcript, use your knowledge of educational content and the title/description to provide valuable learning insights. Respond with ONLY a valid JSON object, no additional text or markdown.`;

    userPrompt = `Video Title: "${title}"
URL: ${videoUrl}

Video Information:
${content}

Note: This video doesn't have available captions/transcript. Please provide an educational summary based on the title and description above.`;
  }

  return { systemPrompt, userPrompt };
}

/**
 * Call Google Gemini API with retry logic
 */
async function callGeminiAPI(systemPrompt, userPrompt, retries = 2) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      topP: 0.95,
      topK: 40,
    },
  };

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle rate limiting
        if (response.status === 429) {
          if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error('Rate limited by Gemini API');
        }

        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Invalid Gemini API key');
        }

        // Handle quota exceeded
        if (response.status === 403) {
          throw new Error('Gemini API quota exceeded');
        }

        throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[API] Gemini API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to call Gemini API');
}

/**
 * Extract and parse JSON from model response
 */
function extractJSON(text) {
  if (!text) return null;

  // Try direct parsing first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Ignore
  }

  // Try to find JSON block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn('[API] Failed to parse JSON from response:', text.substring(0, 200));
    return null;
  }
}

/**
 * Parse Gemini API response
 */
function parseGeminiResponse(apiResponse) {
  try {
    // Navigate through API response structure
    if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const candidate = apiResponse.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No content in Gemini response');
    }

    const text = candidate.content.parts[0].text;
    const parsed = extractJSON(text);

    if (!parsed) {
      throw new Error('Could not parse JSON from Gemini response');
    }

    // Validate structure
    const result = {
      summary: parsed.summary || 'Unable to generate summary',
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };

    return {
      success: true,
      data: result,
      rawText: text,
    };
  } catch (error) {
    console.error('[API] Failed to parse Gemini response:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SEC)) {
    return res.status(429).json({
      error: `Rate limited. Max ${RATE_LIMIT_REQUESTS} requests per ${RATE_LIMIT_WINDOW_SEC}s`,
    });
  }

  // Validate environment
  const envValidation = validateEnv();
  if (!envValidation.valid) {
    console.error('[API] Environment validation failed:', envValidation.errors);
    return res.status(500).json({
      error: 'Server configuration error. Contact administrator.',
      details: process.env.NODE_ENV === 'development' ? envValidation.errors : undefined,
    });
  }

  const { videoId, transcript, title, videoUrl, metadata } = req.body;

  // Validate input - transcript is optional if metadata is provided
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid title' });
  }

  if (!videoUrl || typeof videoUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid videoUrl' });
  }

  // Check if we have either transcript or metadata
  const hasTranscript = transcript && typeof transcript === 'string' && transcript.trim().length > 0;
  const hasMetadata = metadata && typeof metadata === 'object';

  if (!hasTranscript && !hasMetadata) {
    return res.status(400).json({
      error: 'Either transcript or metadata must be provided for summarization'
    });
  }

  try {
    // Check cache first
    const cacheKey = videoId ? generateCacheKey(videoId) : null;
    if (cacheKey) {
      const cached = cache.get(`${cacheKey}_summary`);
      if (cached) {
        return res.status(200).json({ ...cached, cached: true });
      }
    }

    // Process content based on availability
    let content = '';
    let contentType = '';
    let isTruncated = false;

    if (hasTranscript) {
      // Use transcript
      const truncateResult = truncateTranscript(transcript);
      content = truncateResult.transcript;
      isTruncated = truncateResult.isTruncated;
      contentType = 'transcript';
    } else if (hasMetadata) {
      // Use metadata for AI-powered summarization
      content = `Title: ${metadata.title}\nDescription: ${metadata.description}\nVideo URL: ${metadata.url}`;
      contentType = 'metadata';
    }

    // Build prompts based on content type
    const { systemPrompt, userPrompt } = buildPrompt(title, content, videoUrl, contentType);

    // Call Gemini API
    const apiResponse = await callGeminiAPI(systemPrompt, userPrompt);

    // Parse response
    const parseResult = parseGeminiResponse(apiResponse);

    if (!parseResult.success) {
      return res.status(500).json({
        error: 'Failed to process AI response',
        details: process.env.NODE_ENV === 'development' ? parseResult.error : undefined,
      });
    }

    const result = {
      summary: parseResult.data.summary,
      takeaways: parseResult.data.takeaways,
      actions: parseResult.data.actions,
      isTruncated,
      contentType,
      rawModelOutput: process.env.NODE_ENV === 'development' ? parseResult.rawText : undefined,
    };

    // Cache the result
    if (cacheKey) {
      cache.set(`${cacheKey}_summary`, result, CACHE_TTL_SEC);
    }

    return res.status(200).json({ ...result, cached: false });
  } catch (error) {
    console.error('[API] Summarize error:', {
      videoId,
      error: error.message,
      stack: error.stack,
    });

    // Map errors to appropriate status codes
    let statusCode = 500;
    let errorMessage = 'Failed to generate summary. Please try again.';

    if (error.message.includes('Rate limited')) {
      statusCode = 429;
      errorMessage = 'Gemini API rate limit reached. Please wait and try again.';
    } else if (error.message.includes('Invalid Gemini API key')) {
      statusCode = 500;
      errorMessage = 'Server configuration error.';
    } else if (error.message.includes('quota exceeded')) {
      statusCode = 503;
      errorMessage = 'Service quota exceeded. Please try again later.';
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
