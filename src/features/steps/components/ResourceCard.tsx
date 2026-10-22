import { ArrowUpRight, BookOpen, FileText, GraduationCap, Link2, RefreshCw, ThumbsDown, ThumbsUp, Video, type LucideIcon } from 'lucide-react';
import type { Resource, ResourceType } from '@/api/types';
import { BLOOM_LABEL } from '@/lib/levels';
import StageBadge from '@/ui/sketch/StageBadge';
import { safeExternalUrl } from '@/lib/url';
import YouTubeEmbed from '@/ui/YouTubeEmbed';

export type Thumb = 'up' | 'down' | null;

const TYPE: Record<ResourceType, { label: string; icon: LucideIcon }> = {
  youtube: { label: 'Video', icon: Video },
  article: { label: 'Article', icon: FileText },
  official_doc: { label: 'Official docs', icon: BookOpen },
  paper: { label: 'Paper', icon: GraduationCap },
  related: { label: 'Related', icon: Link2 },
};

function length(resource: Resource): string | null {
  if (resource.durationMin) return `${resource.durationMin} min video`;
  if (resource.readingMin) return `${resource.readingMin} min read`;
  return null;
}

export interface ResourceCardProps {
  resource: Resource;
  thumb: Thumb;
  onThumb: (thumb: 'up' | 'down') => void;
  onSwap: () => void;
  swapping?: boolean;
}

/** US-04: what the resource is, why it was picked, its takeaways and the part to watch. */
export default function ResourceCard({ resource, thumb, onThumb, onSwap, swapping = false }: ResourceCardProps) {
  const { label, icon: Icon } = TYPE[resource.type];
  const href = safeExternalUrl(resource.url);
  const segment = resource.concepts?.find((c) => c.start);
  const takeaways = (resource.keyTakeaways ?? []).slice(0, 5);
  const meta = [resource.source, length(resource)].filter(Boolean).join(' · ');

  return (
    <article aria-labelledby={`res-${resource.id}`} className="sk-card space-y-4">
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </p>
        <h3 id={`res-${resource.id}`} className="sk-title text-text">
          {resource.title}
        </h3>
        {meta && <p className="text-sm text-text-muted">{meta}</p>}
        <ul className="flex flex-wrap gap-2 pt-1" aria-label="Level tags">
          <li>
            <StageBadge stage={resource.stage} />
          </li>
          {resource.bloomLevels.map((b) => (
            <li key={b} className="sk-bloom-chip py-1 text-xs font-semibold text-text-muted">
              {b} · {BLOOM_LABEL[b]}
            </li>
          ))}
        </ul>
      </header>

      {resource.type === 'youtube' && resource.youtubeId ? (
        <>
          <YouTubeEmbed videoId={resource.youtubeId} title={resource.title} start={segment?.start} end={segment?.end} />
          <button type="button" onClick={onSwap} className="text-sm text-text-muted underline">
            Video unavailable? Swap it
          </button>
        </>
      ) : (
        href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline"
          >
            Open on {resource.source}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )
      )}

      {resource.whyThis && (
        <p className="text-text">
          <span className="font-semibold">Why this: </span>
          {resource.whyThis}
        </p>
      )}

      {takeaways.length > 0 && (
        <div>
          <p className="mb-1 font-semibold text-text">Key takeaways</p>
          <ul className="list-inside list-disc space-y-1 text-text">
            {takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t-2 border-dashed border-border pt-3">
        <span className="mr-auto text-sm text-text-muted">Useful?</span>
        <button
          type="button"
          aria-pressed={thumb === 'up'}
          aria-label="Helpful"
          onClick={() => {
            onThumb('up');
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-control ${thumb === 'up' ? 'border-2 border-primary text-primary' : 'text-text-muted hover:text-text'}`}
        >
          <ThumbsUp className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-pressed={thumb === 'down'}
          aria-label="Not helpful"
          onClick={() => {
            onThumb('down');
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-control ${thumb === 'down' ? 'border-2 border-primary text-primary' : 'text-text-muted hover:text-text'}`}
        >
          <ThumbsDown className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSwap}
          disabled={swapping}
          className="flex min-h-11 items-center gap-2 rounded-control px-3 font-semibold text-text-muted hover:text-text disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${swapping ? 'animate-spin' : ''}`} aria-hidden="true" />
          {swapping ? 'Swapping…' : 'Swap'}
        </button>
      </footer>
    </article>
  );
}
