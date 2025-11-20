/**
 * API endpoint to fetch YouTube video metadata
 * GET /api/youtube/metadata?videoId=ID
 * 
 * Returns: { title, channelId, channelTitle, viewCount, duration }
 */
import axios from 'axios';
import { cache } from '@/lib/cache';
import { generateCacheKey } from '@/lib/videoUtils';

const CACHE_TTL_SEC = parseInt(process.env.SUMMARY_CACHE_TTL_SEC || '86400', 10);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Get video metadata from YouTube using iFrame embed data
 * This is a lightweight approach that doesn't require API key
 */
async function getMetadataFromEmbed(videoId) {
  try {
    const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      timeout: 5000
    });

    const { title, author_name, author_url } = response.data;
    
    // Extract channel ID from author URL
    const channelIdMatch = author_url.match(/\/(@[\w-]+|channel\/[\w-]+)/);
    const channelId = channelIdMatch ? channelIdMatch[1].replace('@', '') : 'unknown';

    return {
      title: title || 'Unknown Title',
      channelId: channelId,
      channelTitle: author_name || 'Unknown Channel',
      viewCount: '0', // Not available from oEmbed
      duration: 'N/A'
    };
  } catch (error) {
    console.error('Failed to get metadata from embed:', error);
    return null;
  }
}

/**
 * Get video metadata from YouTube Data API (requires API key)
 */
async function getMetadataFromAPI(videoId) {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY not set, falling back to embed data');
    return null;
  }

  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          id: videoId,
          part: 'snippet,contentDetails,statistics',
          key: YOUTUBE_API_KEY
        },
        timeout: 5000
      }
    );

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;
    const duration = video.contentDetails?.duration;

    // Convert ISO 8601 duration to readable format
    const durationMinutes = convertDuration(duration);

    return {
      title: snippet.title,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      viewCount: formatNumber(statistics.viewCount || 0),
      duration: durationMinutes
    };
  } catch (error) {
    console.error('Failed to get metadata from API:', error.message);
    return null;
  }
}

/**
 * Convert ISO 8601 duration to readable format
 * Example: PT1H30M45S -> 1h 30m 45s
 */
function convertDuration(duration) {
  if (!duration) return 'N/A';

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);

  if (!match) return duration;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Format view count (e.g., 1000000 -> 1M)
 */
function formatNumber(num) {
  const number = parseInt(num);
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  return number.toString();
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId } = req.query;

  // Validate input
  if (!videoId || typeof videoId !== 'string' || videoId.length < 10) {
    return res.status(400).json({ error: 'Invalid or missing videoId parameter' });
  }

  try {
    // Check cache first
    const cacheKey = generateCacheKey('metadata', videoId);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Try API first (more detailed), then fallback to embed data
    let metadata = await getMetadataFromAPI(videoId);
    
    if (!metadata) {
      metadata = await getMetadataFromEmbed(videoId);
    }

    if (!metadata) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Cache the result
    cache.set(cacheKey, metadata, CACHE_TTL_SEC);

    return res.status(200).json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return res.status(500).json({ error: 'Failed to fetch video metadata' });
  }
}
