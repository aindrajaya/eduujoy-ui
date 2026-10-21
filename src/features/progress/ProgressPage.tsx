import { ChartColumn } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import type { ProgressHistoryResponse, TopicPosition } from '@/api/types';
import { BLOOM_LABEL, formatConfidence, STAGE_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import StickyActionBar from '@/ui/StickyActionBar';
import ProgressGrid from './components/ProgressGrid';
import { useProgress, useProgressHistory } from './queries';

type HistoryItem = ProgressHistoryResponse['items'][number];

const SOURCE_LABEL: Record<TopicPosition['source'], string> = {
  diagnostic: 'the diagnostic',
  checkpoint: 'a checkpoint',
  override: 'your own choice',
};

const shortDate = (iso: string) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(iso));

function ProgressSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-3 rounded-card border border-border p-4">
        <Skeleton className="h-6 w-48" />
        <SkeletonText lines={2} />
      </div>
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  );
}

function TopicProgress({ item }: { item: TopicPosition }) {
  const history = useProgressHistory(item.topic.id);
  const items: HistoryItem[] = history.data ?? [];
  const { stage, bloom } = item.position;

  return (
    <>
      <section aria-labelledby="topic-title" className="space-y-2 rounded-card border border-border p-4">
        <h2 id="topic-title" className="text-lg font-bold text-text">
          {item.topic.canonicalName}
        </h2>
        <p className="font-semibold text-primary">
          {STAGE_LABEL[stage]} · {bloom} {BLOOM_LABEL[bloom]}
        </p>
        <p className="text-sm text-text-muted">
          Confidence {formatConfidence(item.confidence)} · from {SOURCE_LABEL[item.source]} · updated{' '}
          {shortDate(item.updatedAt)}
        </p>
      </section>

      <section aria-labelledby="grid-title" className="space-y-3">
        <h2 id="grid-title" className="font-semibold text-text">
          Where you are
        </h2>
        <ProgressGrid
          topicName={item.topic.canonicalName}
          current={item.position}
          history={items.map((h) => ({ position: h.position, label: shortDate(h.createdAt) }))}
        />
      </section>

      {items.length > 0 && (
        <section aria-labelledby="history-title" className="space-y-2">
          <h2 id="history-title" className="font-semibold text-text">
            How you moved
          </h2>
          <ol className="space-y-2">
            {[...items].reverse().map((h) => (
              <li key={h.createdAt} className="flex justify-between gap-3 rounded-card border border-border p-3 text-sm">
                <span className="text-text">
                  {STAGE_LABEL[h.position.stage]} · {h.position.bloom} {BLOOM_LABEL[h.position.bloom]}
                  <span className="text-text-muted"> · from {SOURCE_LABEL[h.source]}</span>
                </span>
                <time dateTime={h.createdAt} className="shrink-0 text-text-muted">
                  {shortDate(h.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      )}
      {history.isError && <p className="text-sm text-text-muted">Your history could not load. Try again later.</p>}
    </>
  );
}

/** US-09: position per topic on the Dreyfus × Bloom grid, with how it moved over time (PRD-UI §3). */
export default function ProgressPage() {
  const progress = useProgress();
  const [params, setParams] = useSearchParams();

  return (
    <AsyncView
      query={progress}
      label="your progress"
      skeleton={<ProgressSkeleton />}
      isEmpty={(items) => items.length === 0}
      empty={
        <div className="p-6">
          <StateMessage
            title="No progress yet"
            icon={ChartColumn}
            action={
              <Link to="/start" className="font-semibold text-primary underline">
                Start a learning path
              </Link>
            }
          >
            Your grid appears after your first diagnostic.
          </StateMessage>
        </div>
      }
    >
      {(items) => {
        const selected = items.find((i) => i.topic.id === params.get('topic')) ?? items[0];
        if (!selected) return null;
        return (
          <>
            <div className="animate-fade-in space-y-6 p-4 md:p-6">
              <h1 className="text-2xl font-bold text-text md:text-3xl">Progress</h1>
              {items.length > 1 && (
                <nav aria-label="Topics" className="flex flex-wrap gap-2">
                  {items.map((i) => (
                    <button
                      key={i.topic.id}
                      type="button"
                      aria-current={i.topic.id === selected.topic.id ? 'true' : undefined}
                      onClick={() => {
                        setParams({ topic: i.topic.id }, { replace: true });
                      }}
                      className={`min-h-11 rounded-chip border-2 px-4 font-semibold ${
                        i.topic.id === selected.topic.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text'
                      }`}
                    >
                      {i.topic.canonicalName}
                    </button>
                  ))}
                </nav>
              )}
              <TopicProgress key={selected.topic.id} item={selected} />
            </div>
            {selected.activePathId && (
              <StickyActionBar label="Continue your path" to={`/paths/${encodeURIComponent(selected.activePathId)}`} aboveTabs />
            )}
          </>
        );
      }}
    </AsyncView>
  );
}
