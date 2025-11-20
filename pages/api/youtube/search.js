/**
 * YouTube Search API Endpoint with Filters
 * POST /api/youtube/search
 * 
 * Accepts: {
 *   query: "search query string",
 *   maxResults: 10,
 *   filters: {
 *     minViews: 1000,                    // Minimum view count
 *     minLikes: 10,                      // Minimum likes
 *     durationMin: 15,                   // Minimum duration in minutes
 *     durationMax: 20,                   // Maximum duration in minutes
 *     minEngagementRate: 0.5             // Minimum engagement % (likes/views)
 *   }
 * }
 */

import axios from 'axios';
import { cache } from '@/lib/cache';
import { generateCacheKey } from '@/lib/videoUtils';

const CACHE_TTL_SEC = parseInt(process.env.SUMMARY_CACHE_TTL_SEC || '86400', 10);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT15M30S => 930 seconds
 */
function parseDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Convert seconds to minutes
 */
function secondsToMinutes(seconds) {
  return Math.round(seconds / 60);
}

/**
 * Calculate engagement rate
 */
function calculateEngagementRate(likes, views) {
  if (views === 0) return 0;
  return (likes / views) * 100;
}

/**
 * Search YouTube videos using YouTube Data API v3
 * Gets video statistics to enable filtering
 */
async function searchYouTube(query, maxResults = 10, filters = {}) {
  if (!YOUTUBE_API_KEY) {
    return {
      error: 'YouTube API key not configured',
      message: 'YOUTUBE_API_KEY environment variable is required'
    };
  }

  try {
    // Step 1: Search for videos
    const searchResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          q: query,
          part: 'snippet',
          type: 'video',
          maxResults: Math.min(maxResults * 3, 50), // Get more results to filter
          relevanceLanguage: 'en',
          safeSearch: 'moderate',
          order: 'relevance',
          key: YOUTUBE_API_KEY
        },
        timeout: 10000
      }
    );

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return {
        results: [],
        query: query,
        count: 0,
        message: 'No videos found for the given query'
      };
    }

    const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

    // Step 2: Get video statistics (views, likes, duration)
    const statsResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          id: videoIds,
          part: 'statistics,contentDetails',
          key: YOUTUBE_API_KEY
        },
        timeout: 10000
      }
    );

    // Step 3: Merge search results with statistics
    const videoStatsMap = {};
    if (statsResponse.data.items) {
      statsResponse.data.items.forEach(item => {
        videoStatsMap[item.id] = {
          viewCount: parseInt(item.statistics?.viewCount || 0),
          likeCount: parseInt(item.statistics?.likeCount || 0),
          duration: item.contentDetails?.duration
        };
      });
    }

    // Step 4: Transform and filter results
    let results = searchResponse.data.items
      .map((item) => {
        const snippet = item.snippet;
        const stats = videoStatsMap[item.id.videoId] || {};
        const durationSeconds = parseDuration(stats.duration);
        const durationMinutes = secondsToMinutes(durationSeconds);
        const engagementRate = calculateEngagementRate(stats.likeCount, stats.viewCount);

        return {
          videoId: item.id.videoId,
          title: snippet.title,
          description: snippet.description,
          thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          channelTitle: snippet.channelTitle,
          channelId: snippet.channelId,
          publishedAt: snippet.publishedAt,
          viewCount: stats.viewCount || 0,
          likeCount: stats.likeCount || 0,
          duration: stats.duration,
          durationMinutes: durationMinutes,
          engagementRate: parseFloat(engagementRate.toFixed(2))
        };
      })
      .filter(video => {
        // Apply filters
        if (filters.minViews && video.viewCount < filters.minViews) return false;
        if (filters.minLikes && video.likeCount < filters.minLikes) return false;
        if (filters.durationMin && video.durationMinutes < filters.durationMin) return false;
        if (filters.durationMax && video.durationMinutes > filters.durationMax) return false;
        if (filters.minEngagementRate && video.engagementRate < filters.minEngagementRate) return false;
        return true;
      })
      .slice(0, maxResults); // Return requested number after filtering

    return {
      results: results,
      query: query,
      count: results.length,
      totalResults: searchResponse.data.pageInfo?.totalResults || 0,
      filters: filters
    };
  } catch (error) {
    console.error('YouTube search error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      return {
        error: 'YouTube API quota exceeded',
        message: 'The daily API quota has been exceeded. Please try again tomorrow.',
        status: 403
      };
    }
    
    if (error.response?.status === 400) {
      return {
        error: 'Invalid search query',
        message: error.response.data?.error?.message || 'The search query is invalid',
        status: 400
      };
    }

    return {
      error: 'Search failed',
      message: error.message,
      status: 500
    };
  }
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
      allowedMethod: 'POST'
    });
  }

  try {
    const { query, maxResults = 10, filters = {} } = req.body;

    // Validate query parameter
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Query parameter is required and must be a non-empty string',
        example: {
          query: 'machine learning tutorial',
          maxResults: 10,
          filters: {
            minViews: 1000,
            minLikes: 10,
            durationMin: 15,
            durationMax: 20,
            minEngagementRate: 0.5
          }
        }
      });
    }

    const searchQuery = query.trim();
    const filterKey = JSON.stringify(filters);
    
    // Check cache first (include filters in cache key)
    const cacheKey = generateCacheKey('youtube-search', `${searchQuery}_${filterKey}`);
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
      console.log(`✅ Cache hit for search: "${searchQuery}" with filters`);
      return res.status(200).json({
        ...cachedResult,
        cached: true,
        cacheKey: cacheKey
      });
    }

    console.log(`🔍 Searching YouTube for: "${searchQuery}"`, filters);

    // Search YouTube with filters
    const searchResult = await searchYouTube(searchQuery, maxResults, filters);

    // Cache successful results
    if (!searchResult.error && searchResult.results.length > 0) {
      cache.set(cacheKey, searchResult, CACHE_TTL_SEC);
      console.log(`✅ Search results cached for ${CACHE_TTL_SEC} seconds`);
    }

    // Return based on whether there's an error
    if (searchResult.error) {
      const statusCode = searchResult.status || 500;
      return res.status(statusCode).json({
        error: searchResult.error,
        message: searchResult.message,
        query: searchQuery,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      ...searchResult,
      cached: false,
      timestamp: new Date().toISOString(),
      tip: 'Results are cached for 24 hours. Filter combinations are cached separately.'
    });
  } catch (error) {
    console.error('❌ API error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
