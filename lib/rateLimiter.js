/**
 * Simple in-memory rate limiter
 * For production, use Redis or external service
 */

const requestCounts = new Map();

/**
 * Check if request exceeds rate limit
 * @param {string} identifier - Client identifier (IP, user ID, etc.)
 * @param {number} limit - Max requests allowed
 * @param {number} windowSec - Time window in seconds
 * @returns {boolean} True if within limit
 */
export function checkRateLimit(identifier, limit = 10, windowSec = 60) {
  const now = Date.now();
  const key = identifier;

  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const timestamps = requestCounts.get(key);

  // Remove timestamps outside the window
  const filtered = timestamps.filter(ts => now - ts < windowSec * 1000);

  if (filtered.length >= limit) {
    return false; // Rate limit exceeded
  }

  filtered.push(now);
  requestCounts.set(key, filtered);
  return true; // Within limit
}

/**
 * Get client IP from request
 * @param {object} req - Next.js request object
 * @returns {string} Client IP
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Cleanup old entries periodically (run hourly)
 */
export function cleanupRateLimiter() {
  const now = Date.now();
  const maxWindowSize = 120 * 1000; // 2 minutes

  for (const [key, timestamps] of requestCounts.entries()) {
    const filtered = timestamps.filter(ts => now - ts < maxWindowSize);
    if (filtered.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, filtered);
    }
  }
}

// Cleanup every hour
if (typeof global !== 'undefined') {
  setInterval(cleanupRateLimiter, 60 * 60 * 1000);
}
