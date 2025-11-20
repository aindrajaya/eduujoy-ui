/**
 * API endpoint to fetch YouTube video transcript
 * GET /api/transcript?videoId=ID
 */
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import { cache } from '@/lib/cache';
import { generateCacheKey, isCacheExpired } from '@/lib/videoUtils';

const CACHE_TTL_SEC = parseInt(process.env.SUMMARY_CACHE_TTL_SEC || '86400', 10);

/**
 * Fallback method to extract transcript using web scraping
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Array>} Transcript segments
 */
async function getTranscriptFromWebScraping(videoId) {
  try {
    // Try to get video page and look for caption data
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    // Look for caption tracks in the HTML
    const captionRegex = /"captionTracks":\s*\[([^\]]*)\]/;
    const match = response.data.match(captionRegex);

    if (match) {
      const captionData = JSON.parse(`[${match[1]}]`);
      if (captionData.length > 0) {
        // Get the first available caption track
        const captionTrack = captionData[0];
        if (captionTrack.baseUrl) {
          const captionResponse = await axios.get(captionTrack.baseUrl);
          // Parse XML caption data
          const xmlData = captionResponse.data;
          const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
          const segments = [];
          let match;
          let offset = 0;

          while ((match = textRegex.exec(xmlData)) !== null) {
            const text = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
            if (text.trim()) {
              segments.push({
                text: text.trim(),
                offset: offset,
                duration: 5000 // Default 5 seconds per segment
              });
              offset += 5000;
            }
          }

          if (segments.length > 0) {
            return segments;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.log('Web scraping fallback failed:', error.message);
    return null;
  }
}

/**
 * Get video metadata for fallback summarization
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Video metadata
 */
async function getVideoMetadata(videoId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });

    // Extract basic metadata from HTML
    const titleMatch = response.data.match(/<title>([^<]*)<\/title>/);
    const descriptionMatch = response.data.match(/"description":\s*"([^"]*)"/);

    return {
      title: titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'Unknown Title',
      description: descriptionMatch ? descriptionMatch[1] : 'No description available',
      url: videoUrl
    };
  } catch (error) {
    return {
      title: 'Unknown Title',
      description: 'Could not fetch video information',
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }
}

/**
 * Merge transcript segments into single string with optional timestamps
 * @param {array} segments - Transcript segments
 * @param {boolean} includeTimestamps - Include timing info
 * @returns {string} Merged transcript
 */
function mergeTranscriptSegments(segments, includeTimestamps = false) {
  if (!segments || !Array.isArray(segments)) return '';

  return segments
    .map((seg) => {
      if (includeTimestamps && seg.offset) {
        const seconds = Math.floor(seg.offset / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `[${minutes}:${String(secs).padStart(2, '0')}] ${seg.text}`;
      }
      return seg.text;
    })
    .join(' ');
}

export default async function handler(req, res) {
  const { videoId } = req.query;

  // Validate input
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid videoId parameter',
      transcript: '',
    });
  }

  // Validate video ID format
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      error: 'Invalid YouTube video ID format',
      transcript: '',
    });
  }

  try {
    // Check cache first
    const cacheKey = generateCacheKey(videoId);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        transcript: cachedData.transcript,
        rawSegments: cachedData.rawSegments,
        cached: true,
        available: true,
        method: cachedData.method || 'cached'
      });
    }

    let segments = null;
    let method = 'unknown';

    // Method 1: Try youtube-transcript library
    try {
      console.log(`[Transcript] Trying youtube-transcript library for video ${videoId}`);
      segments = await YoutubeTranscript.fetchTranscript(videoId);
      method = 'youtube-transcript';
    } catch (error) {
      console.log(`[Transcript] youtube-transcript failed: ${error.message}`);
    }

    // Method 2: Try web scraping fallback
    if (!segments || segments.length === 0) {
      try {
        console.log(`[Transcript] Trying web scraping fallback for video ${videoId}`);
        segments = await getTranscriptFromWebScraping(videoId);
        if (segments && segments.length > 0) {
          method = 'web-scraping';
        }
      } catch (error) {
        console.log(`[Transcript] Web scraping failed: ${error.message}`);
      }
    }

    // Method 3: Get video metadata for AI summarization fallback
    let metadata = null;
    if (!segments || segments.length === 0) {
      console.log(`[Transcript] Getting video metadata for AI fallback for video ${videoId}`);
      metadata = await getVideoMetadata(videoId);
      method = 'metadata-only';
    }

    if (!segments || segments.length === 0) {
      // Return metadata for AI processing
      return res.status(200).json({
        transcript: '',
        rawSegments: [],
        available: false,
        method: method,
        metadata: metadata,
        message: 'No transcript available, but video metadata retrieved for AI summarization'
      });
    }

    // Merge segments into single string
    const transcript = mergeTranscriptSegments(segments, true);

    // Cache the result
    cache.set(
      cacheKey,
      { transcript, rawSegments: segments, method },
      CACHE_TTL_SEC
    );

    return res.status(200).json({
      transcript,
      rawSegments: segments,
      cached: false,
      available: true,
      method: method
    });
  } catch (error) {
    // Handle specific errors
    if (error.message?.includes('Could not extract') || error.message?.includes('Video not found')) {
      return res.status(200).json({
        error: 'Video not found or captions not available',
        transcript: '',
        available: false,
        method: 'error'
      });
    }

    console.error('[API] Transcript fetch error:', {
      videoId,
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to fetch transcript. Please try again later.',
      transcript: '',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
