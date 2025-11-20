/**
 * VideoPlayerWithSummary Component
 * Renders YouTube video player with transcript summarization via Gemini API
 */
'use client';

import { useState } from 'react';
import axios from 'axios';
import {
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

/**
 * Main component for YouTube video player with AI summarization
 */
export default function VideoPlayerWithSummary({ videoId, title }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  /**
   * Fetch transcript and generate summary
   */
  const handleGenerateSummary = async () => {
    setError(null);
    setLoading(true);
    setTranscriptLoading(true);

    try {
      // Step 1: Fetch transcript
      const transcriptRes = await axios.get('/api/transcript', {
        params: { videoId },
      });

      if (!transcriptRes.data.transcript) {
        setError(transcriptRes.data.error || 'No transcript available');
        setLoading(false);
        setTranscriptLoading(false);
        return;
      }

      setTranscript(transcriptRes.data.transcript);
      setTranscriptLoading(false);

      // Step 2: Generate summary with Gemini
      const summaryRes = await axios.post('/api/summarize', {
        videoId,
        transcript: transcriptRes.data.transcript,
        title,
        videoUrl,
      });

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
    <div className="w-full space-y-4">
      {/* YouTube Player */}
      <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-lg">
        <div className="aspect-video">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Transcript Warning */}
      {isTruncated && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Transcript was truncated to fit model limits. Summary is based on the first portion.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-700 hover:text-red-900 underline mt-1 inline-flex items-center gap-1"
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
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {transcriptLoading ? 'Fetching transcript...' : 'Generating summary...'}
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate AI Summary
            </>
          )}
        </button>
      )}

      {/* Summary Display */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-semibold">AI Summary</h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Summary Paragraph */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
              <p className="text-gray-700 leading-relaxed text-sm">
                {summary.summary}
              </p>
            </div>

            {/* Takeaways */}
            {summary.takeaways && summary.takeaways.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Key Takeaways</h4>
                <ul className="space-y-2">
                  {summary.takeaways.map((takeaway, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-gray-700"
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
                <h4 className="font-semibold text-gray-900 mb-2">Suggested Actions</h4>
                <ul className="space-y-2">
                  {summary.actions.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-gray-700"
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
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {summary.cached && '📦 Cached result'}
            </span>
            <button
              onClick={() => {
                setSummary(null);
                setError(null);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Generate New
            </button>
          </div>
        </div>
      )}

      {/* Open YouTube Link */}
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        Watch on YouTube <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
