import { Play } from 'lucide-react';
import { useState } from 'react';
import { formatTimestamp, parseTimestamp } from '@/lib/time';

export interface YouTubeEmbedProps {
  videoId: string;
  /** The video's own title, shown unaltered (YouTube developer policies). */
  title: string;
  /** SOP segment, "m:ss" or "h:mm:ss" (ResourceConcept start/end). */
  start?: string | null;
  end?: string | null;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * PRD-UI §8 facade: the unaltered thumbnail and title until the learner taps; only then the
 * youtube-nocookie iframe loads (no third-party script at page load), starting playback at the
 * SOP segment. The player's own controls are never covered.
 */
export default function YouTubeEmbed({ videoId, title, start, end }: YouTubeEmbedProps) {
  const [playing, setPlaying] = useState(false);
  if (!VIDEO_ID.test(videoId)) return null;

  const startS = parseTimestamp(start);
  const endS = parseTimestamp(end);
  const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
  if (startS !== undefined) params.set('start', String(startS));
  if (endS !== undefined && (startS === undefined || endS > startS)) params.set('end', String(endS));
  const thumb = (size: string) => `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;

  return (
    <figure className="space-y-2">
      {startS !== undefined && (
        <p className="text-sm font-semibold text-primary">
          Watch {formatTimestamp(startS)}
          {endS !== undefined && endS > startS ? `–${formatTimestamp(endS)}` : ' onwards'}
        </p>
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-card bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
            title={title}
            // autoplay so the tap that loaded the player also starts it (YouTube policy); see status spec request.
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
            }}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Play video: ${title}`}
          >
            <img
              src={thumb('hqdefault')}
              srcSet={`${thumb('mqdefault')} 320w, ${thumb('hqdefault')} 480w, ${thumb('sddefault')} 640w`}
              sizes="(min-width: 768px) 640px, 100vw"
              width={480}
              height={360}
              loading="lazy"
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-20 items-center justify-center rounded-xl bg-black/75 transition-colors group-hover:bg-red-600">
                <Play className="h-7 w-7 fill-white text-white" aria-hidden="true" />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="text-sm text-text-muted">{title}</figcaption>
    </figure>
  );
}
