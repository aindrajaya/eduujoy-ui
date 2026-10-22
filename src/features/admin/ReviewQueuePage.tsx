import { Inbox } from 'lucide-react';
import { useDeferredValue, useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ReviewItem } from '@/api/types';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import AdminNav from './components/AdminNav';
import type { ReviewStatus } from './keys';
import { useResolveReview, useReviewQueue } from './queries';

const KIND_LABEL: Record<ReviewItem['kind'], string> = {
  diagnostic_item: 'Diagnostic question',
  resource: 'Resource',
  path: 'Path',
  learner_report: 'Learner report',
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-card border border-border p-4">
          <Skeleton className="h-4 w-32" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const resolve = useResolveReview();
  const [note, setNote] = useState('');
  const noteId = useId();
  const titleId = useId();
  const busy = resolve.isPending;
  const act = (resolution: 'approved' | 'rejected') => {
    resolve.mutate({ id: item.id, resolution, ...(note.trim() ? { note: note.trim() } : {}) });
  };
  const detail = Object.entries(item.detail ?? {});

  return (
    <article aria-labelledby={titleId} className="space-y-3 rounded-card border border-border p-4">
      <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <span className="rounded-chip bg-surface-muted px-3 py-1 font-semibold text-text">{KIND_LABEL[item.kind]}</span>
        <time dateTime={item.createdAt}>{when(item.createdAt)}</time>
      </p>
      <h2 id={titleId} className="font-semibold text-text">
        {item.reason}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">Target</dt>
        <dd className="font-mono break-all text-text">{item.targetId}</dd>
        {detail.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-text-muted">{key}</dt>
            <dd className="break-words text-text">{typeof value === 'string' ? value : JSON.stringify(value)}</dd>
          </div>
        ))}
      </dl>
      {item.status === 'open' ? (
        <>
          <div>
            <label htmlFor={noteId} className="text-sm font-semibold text-text">
              Note (optional)
            </label>
            <textarea
              id={noteId}
              value={note}
              maxLength={1000}
              onChange={(e) => {
                setNote(e.target.value);
              }}
              rows={2}
              className="mt-1 w-full rounded-lg border-2 border-border bg-surface p-2 text-sm text-text"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                act('approved');
              }}
              className="min-h-11 flex-1 rounded-xl bg-primary px-4 font-semibold text-on-primary disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                act('rejected');
              }}
              className="min-h-11 flex-1 rounded-xl border-2 border-danger bg-surface px-4 font-semibold text-danger disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm font-semibold text-text-muted">
          Resolved{item.resolution ? `: ${item.resolution}` : ''}
        </p>
      )}
    </article>
  );
}

/** FR-24: flagged and low-confidence items for reviewers (and admins) to approve or reject. */
export default function ReviewQueuePage() {
  const [params, setParams] = useSearchParams();
  const status: ReviewStatus = params.get('status') === 'resolved' ? 'resolved' : 'open';
  const queue = useReviewQueue(status);
  const [filter, setFilter] = useState('');
  // PRD-UI §9: filtering a long queue stays responsive while typing.
  const deferred = useDeferredValue(filter.trim().toLowerCase());
  const filterId = useId();
  const items = queue.data?.pages.flatMap((page) => page.items);
  const openCount = queue.data?.pages[0]?.openCount;

  return (
    <main>
      <AdminNav openCount={status === 'open' ? openCount : undefined} />
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-text">Review queue</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div role="group" aria-label="Status" className="flex gap-2">
            {(['open', 'resolved'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => {
                  setParams(s === 'open' ? {} : { status: s }, { replace: true });
                }}
                className={`min-h-11 rounded-chip border-2 px-4 font-semibold ${
                  status === s ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text'
                }`}
              >
                {s === 'open' ? 'Open' : 'Resolved'}
              </button>
            ))}
          </div>
          <div className="min-w-48 flex-1">
            <label htmlFor={filterId} className="text-sm font-semibold text-text">
              Filter
            </label>
            <input
              id={filterId}
              type="search"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
              }}
              placeholder="Reason or target"
              className="mt-1 min-h-11 w-full rounded-lg border-2 border-border bg-surface px-3 text-text"
            />
          </div>
        </div>

        <AsyncView
          query={{ ...queue, data: items }}
          label="the review queue"
          skeleton={<QueueSkeleton />}
          isEmpty={(list) => list.length === 0}
          empty={
            <StateMessage title={status === 'open' ? 'Nothing to review' : 'Nothing resolved yet'} icon={Inbox}>
              {status === 'open' ? 'New flags and low-confidence items appear here.' : 'Resolved items appear here.'}
            </StateMessage>
          }
        >
          {(list) => {
            const shown = deferred
              ? list.filter((i) => `${i.reason} ${i.targetId} ${KIND_LABEL[i.kind]}`.toLowerCase().includes(deferred))
              : list;
            return (
              <div className="space-y-3">
                {shown.length === 0 && <p className="text-text-muted">No items match “{filter}”.</p>}
                {shown.map((item) => (
                  <ReviewCard key={item.id} item={item} />
                ))}
                {queue.hasNextPage && (
                  <button
                    type="button"
                    disabled={queue.isFetchingNextPage}
                    onClick={() => void queue.fetchNextPage()}
                    className="min-h-11 w-full rounded-xl border-2 border-border font-semibold text-text disabled:opacity-60"
                  >
                    {queue.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            );
          }}
        </AsyncView>
      </div>
    </main>
  );
}
