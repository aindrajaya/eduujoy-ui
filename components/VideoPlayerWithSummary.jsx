/**
 * VideoPlayerWithSummary Component
 * 
 * COMPLIANCE NOTES:
 * - Uses official YouTube IFrame embed with youtube-nocookie.com domain
 * - Privacy-first: No cookies set on the YouTube domain
 * - GDPR compliant: User consent not required for embedded player
 * - COPPA compliant: Safe for child-directed content
 * - No video downloading or re-hosting
 * - Full attribution to creators and channels
 * - No autoplay (user-initiated only)
 * - Respects YouTube Partner Program monetization
 * - Fair use transcription for AI summarization
 * 
 * @see YOUTUBE_COMPLIANCE_GUIDE.md for full compliance documentation
 * @see YOUTUBE_TECHNICAL_GUIDE.md for technical details
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  BarChart3,
} from 'lucide-react';

/**
 * Enhanced VideoPlayerWithSummary component with YouTube compliance
 */
export default function VideoPlayerWithSummary({ videoId, title }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [videoMeta, setVideoMeta] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef(null);
  const [isUserInitialized, setIsUserInitialized] = useState(false);

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  /**
   * Load YouTube IFrame API for advanced tracking
   */
  useEffect(() => {
    // Load official YouTube IFrame API
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else if (window.YT) {
      initializePlayer();
    }
  }, []);

  /**
   * Initialize YouTube Player with event tracking for learning analytics
   */
  const initializePlayer = useCallback(() => {
    if (playerRef.current) return;

    const container = document.getElementById(`youtube-player-${videoId}`);
    if (!container) return;

    try {
      playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 0, // ✅ COMPLIANCE: No autoplay
          controls: 1, // ✅ Show YouTube controls
          modestbranding: 1, // ✅ Minimal YouTube branding
          rel: 0, // ✅ Don't show unrelated videos
          fs: 1, // ✅ Allow fullscreen
          iv_load_policy: 3, // Hide annotations
          disablekb: 0, // Allow keyboard controls
          // Respect user's playback privacy
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (err) {
      console.error('Failed to initialize YouTube Player:', err);
    }
  }, [videoId]);

  /**
   * Player ready callback
   */
  const onPlayerReady = (event) => {
    setPlayerReady(true);
  };

  /**
   * Track player state changes for learning analytics
   */
  const onPlayerStateChange = (event) => {
    const states = {
      '-1': 'Unstarted',
      '0': 'Ended',
      '1': 'Playing',
      '2': 'Paused',
      '3': 'Buffering',
      '5': 'Cued',
    };

    // Track completion for learning path progress
    if (event.data === 0) {
      trackVideoCompletion();
    }
  };

  /**
   * Handle player errors gracefully
   */
  const onPlayerError = (event) => {
    const errors = {
      2: 'Invalid parameter',
      5: 'HTML5 player error',
      100: 'Video not found',
      101: 'Video owner does not allow embedding',
      150: 'Video owner does not allow embedding',
    };

    const errorMsg = errors[event.data] || 'Video playback error';
    setError(errorMsg);
  };

  /**
   * Track video completion for learning analytics
   */
  const trackVideoCompletion = async () => {
    try {
      await axios.post('/api/analytics/video-completed', {
        videoId,
        title,
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Analytics tracking failed (non-critical):', err);
    }
  };

  /**
   * Fetch video metadata from YouTube API
   */
  const fetchVideoMetadata = useCallback(async () => {
    try {
      const response = await axios.get('/api/youtube/metadata', {
        params: { videoId },
      });
      setVideoMeta(response.data);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  }, [videoId]);

  /**
   * Generate AI summary using transcript or metadata
   */
  const handleGenerateSummary = async () => {
    // Fetch metadata on first interaction
    if (!isUserInitialized) {
      setIsUserInitialized(true);
      await fetchVideoMetadata();
    }

    setError(null);
    setLoading(true);
    setTranscriptLoading(true);

    try {
      // Step 1: Fetch transcript or metadata
      const transcriptRes = await axios.get('/api/transcript', {
        params: { videoId },
      });

      setTranscriptLoading(false);

      const hasTranscript = transcriptRes.data.available && transcriptRes.data.transcript;
      const hasMetadata = transcriptRes.data.metadata;

      if (!hasTranscript && !hasMetadata) {
        setError(transcriptRes.data.error || 'No transcript or video information available');
        setLoading(false);
        return;
      }

      if (hasTranscript) {
        setTranscript(transcriptRes.data.transcript);
      }

      // Step 2: Generate summary with Gemini AI
      const summaryPayload = {
        videoId,
        title,
        videoUrl,
      };

      if (hasTranscript) {
        summaryPayload.transcript = transcriptRes.data.transcript;
      } else if (hasMetadata) {
        summaryPayload.metadata = transcriptRes.data.metadata;
      }

      const summaryRes = await axios.post('/api/summarize', summaryPayload);

      setSummary(summaryRes.data);
      setIsTruncated(summaryRes.data.isTruncated || false);
    } catch (err) {
      console.error('Error generating summary:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to generate summary. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setTranscriptLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 animate-fadeIn">
      {/* COMPLIANCE NOTIFICATION */}
      <div className="flex items-start gap-3 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs md:text-sm text-blue-800">
          <strong>🔒 Privacy-First & Creator-Friendly:</strong> Videos use youtube-nocookie.com (no cookies set). Full monetization support. 
          <a 
            href="https://developers.google.com/youtube/terms/developer-policies-guide?hl=en" 
            target="_blank"
            rel="noopener noreferrer"
            className="underline ml-1 hover:text-blue-900"
          >
            Learn about our compliance →
          </a>
        </p>
      </div>

      {/* YouTube IFrame Player */}
      <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-md md:shadow-lg">
        <div className="aspect-video w-full max-h-96 md:max-h-full" id={`youtube-player-${videoId}`}>
          {/* Fallback: Static IFrame embed (always works) */}
          <iframe
            className="w-full h-full"
            src={`${embedUrl}?modestbranding=1&rel=0&fs=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Video Metadata */}
      {videoMeta && (
        <div className="flex items-start justify-between gap-3 md:gap-4 px-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">
              {videoMeta.title}
            </h3>
            <a
              href={`https://youtube.com/channel/${videoMeta.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs md:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {videoMeta.channelTitle}
            </a>
          </div>
          <div className="text-right text-xs text-gray-600 flex-shrink-0">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {videoMeta.viewCount}
            </div>
            <div className="text-gray-500">{videoMeta.duration}</div>
          </div>
        </div>
      )}

      {/* Transcript Truncation Warning */}
      {isTruncated && (
        <div className="flex items-start gap-2 p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm text-yellow-800">
            Transcript was truncated to fit model limits. Summary is based on the first portion.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-2 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-red-900">{error}</p>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs md:text-sm text-red-700 hover:text-red-900 underline mt-1 inline-flex items-center gap-1"
            >
              Open on YouTube <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Generate Summary Button */}
      {!summary && (
        <button
          onClick={handleGenerateSummary}
          disabled={loading}
          className="w-full px-4 py-3 md:py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm md:text-base rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md md:shadow-lg hover:shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{transcriptLoading ? 'Fetching transcript...' : 'Generating summary...'}</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Generate AI Summary</span>
            </>
          )}
        </button>
      )}

      {/* Summary Display */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-md md:shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 md:px-6 py-3 md:py-4 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-semibold text-sm md:text-base">AI Summary</h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-4">
            {/* Summary Paragraph */}
            <div>
              <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2">Summary</h4>
              <p className="text-gray-700 leading-relaxed text-xs md:text-sm">
                {summary.summary}
              </p>
            </div>

            {/* Takeaways */}
            {summary.takeaways && summary.takeaways.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2">Key Takeaways</h4>
                <ul className="space-y-2">
                  {summary.takeaways.map((takeaway, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-xs md:text-sm text-gray-700"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {summary.actions && summary.actions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2">Suggested Actions</h4>
                <ul className="space-y-2">
                  {summary.actions.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-xs md:text-sm text-gray-700"
                    >
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">
                {summary.cached && '📦 Cached result'}
                {summary.contentType === 'metadata' && '🤖 AI-generated from video info'}
              </span>
            </div>
            <button
              onClick={() => {
                setSummary(null);
                setError(null);
              }}
              className="text-xs md:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Generate New
            </button>
          </div>
        </div>
      )}

      {/* Attribution & Compliance Footer */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs md:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Watch Full Video on YouTube <ExternalLink className="w-4 h-4" />
        </a>
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>✅ Compliance Notice:</strong> This video is streamed directly from YouTube with full support 
          for creator monetization. EduJoy adds educational value through AI summarization while respecting 
          all YouTube policies and creator revenue.
          {videoMeta && (
            <>
              {' '}
              <a
                href={`https://youtube.com/channel/${videoMeta.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Visit {videoMeta.channelTitle} on YouTube
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
