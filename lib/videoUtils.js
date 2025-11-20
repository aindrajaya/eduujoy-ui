/**
 * Utility functions for YouTube video handling
 */

/**
 * Extract video ID from YouTube URL
 * Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export function extractVideoId(url) {
  if (!url) return null;

  // Handle youtu.be/ID format
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v=ID format
  const longMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];

  // Handle youtube.com/embed/ID format
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Generate cache key for transcript caching
 * @param {string} videoId - YouTube video ID
 * @returns {string} Cache key
 */
export function generateCacheKey(videoId) {
  return `transcript_${videoId}`;
}

/**
 * Check if cache entry has expired
 * @param {number} timestamp - Cache entry timestamp
 * @param {number} ttlSec - Time-to-live in seconds
 * @returns {boolean} True if expired
 */
export function isCacheExpired(timestamp, ttlSec) {
  const now = Date.now();
  return now - timestamp > ttlSec * 1000;
}
