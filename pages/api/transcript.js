/**
 * API endpoint to fetch YouTube video transcript
 * GET /api/transcript?videoId=ID
 */
import { getTranscript } from 'youtube-transcript';
import { cache } from '@/lib/cache';
import { generateCacheKey, isCacheExpired } from '@/lib/videoUtils';

const CACHE_TTL_SEC = parseInt(process.env.SUMMARY_CACHE_TTL_SEC || '86400', 10);

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
      });
    }

    // Fetch transcript from YouTube
    const segments = await getTranscript(videoId);

    if (!segments || segments.length === 0) {
      return res.status(404).json({
        error: 'No captions available for this video',
        transcript: '',
      });
    }

    // Merge segments into single string
    const transcript = mergeTranscriptSegments(segments, true);

    // Cache the result
    cache.set(
      cacheKey,
      { transcript, rawSegments: segments },
      CACHE_TTL_SEC
    );

    return res.status(200).json({
      transcript,
      rawSegments: segments,
      cached: false,
    });
  } catch (error) {
    // Handle specific errors
    if (error.message?.includes('Could not extract')) {
      return res.status(404).json({
        error: 'Video not found or captions not available',
        transcript: '',
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
