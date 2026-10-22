import './staffChunk';
import { useId, useState, type SyntheticEvent } from 'react';
import { useSearchParams } from 'react-router';
import type { MetricsRange } from '@/api/endpoints/admin';
import AsyncView from '@/ui/AsyncView';
import { Skeleton } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import AdminNav from './components/AdminNav';
import { defaultRange, useCostMetrics, useLatencyMetrics } from './queries';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-US');
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const ms = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${count.format(value)} ms`);

const thClass = 'px-3 py-2 text-left font-semibold text-text-muted';
const tdClass = 'px-3 py-2 text-text';
const numClass = 'px-3 py-2 text-right tabular-nums text-text';

function TableSkeleton() {
  return <Skeleton className="h-40 w-full rounded-card" />;
}

function CostTable({ range }: { range: MetricsRange }) {
  const cost = useCostMetrics(range);
  return (
    <AsyncView
      query={cost}
      label="AI cost"
      skeleton={<TableSkeleton />}
      isEmpty={(data) => data.rows.length === 0}
      empty={<StateMessage title="No AI calls in this range" />}
    >
      {(data) => (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">
              AI cost per pipeline stage and model, {data.from} to {data.to}
            </caption>
            <thead className="bg-surface-muted">
              <tr>
                <th scope="col" className={thClass}>
                  Stage
                </th>
                <th scope="col" className={thClass}>
                  Model
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Calls
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Input tokens
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Output tokens
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Cache reads
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.stage}:${row.provider}:${row.model}`} className="border-t border-border">
                  <th scope="row" className={`${tdClass} font-semibold`}>
                    {row.stage}
                  </th>
                  <td className={tdClass}>
                    {row.model} <span className="text-text-muted">({row.provider})</span>
                  </td>
                  <td className={numClass}>{count.format(row.calls)}</td>
                  <td className={numClass}>{count.format(row.inputTokens)}</td>
                  <td className={numClass}>{count.format(row.outputTokens)}</td>
                  <td className={numClass}>{row.cacheReadTokens === undefined ? '–' : count.format(row.cacheReadTokens)}</td>
                  <td className={numClass}>{usd.format(row.costUsd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <th scope="row" colSpan={6} className={`${tdClass} text-right font-semibold`}>
                  Total
                </th>
                <td className={`${numClass} font-bold`}>{usd.format(data.totalUsd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </AsyncView>
  );
}

function LatencyTable({ range }: { range: MetricsRange }) {
  const latency = useLatencyMetrics(range);
  return (
    <AsyncView
      query={latency}
      label="latency"
      skeleton={<TableSkeleton />}
      isEmpty={(data) => data.rows.length === 0}
      empty={<StateMessage title="No calls in this range" />}
    >
      {(data) => (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <caption className="sr-only">
              Latency per pipeline stage and model, {data.from} to {data.to}
            </caption>
            <thead className="bg-surface-muted">
              <tr>
                <th scope="col" className={thClass}>
                  Stage
                </th>
                <th scope="col" className={thClass}>
                  Model
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Calls
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  p50
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  p95
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Errors
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.stage}:${row.model}`} className="border-t border-border">
                  <th scope="row" className={`${tdClass} font-semibold`}>
                    {row.stage}
                  </th>
                  <td className={tdClass}>{row.model}</td>
                  <td className={numClass}>{count.format(row.count)}</td>
                  <td className={numClass}>{ms(row.p50Ms)}</td>
                  <td className={numClass}>{ms(row.p95Ms)}</td>
                  <td className={numClass}>{row.errorRate === undefined ? '–' : percent.format(row.errorRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AsyncView>
  );
}

/** FR-25: AI cost and latency per pipeline stage and model (admins only). */
export default function MetricsPage() {
  const [params, setParams] = useSearchParams();
  const fallback = defaultRange();
  const range: MetricsRange = { from: params.get('from') ?? fallback.from, to: params.get('to') ?? fallback.to };
  const [draft, setDraft] = useState(range);
  const fromId = useId();
  const toId = useId();
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  const apply = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invalid || !draft.from || !draft.to) return;
    setParams({ from: draft.from, to: draft.to }, { replace: true });
  };

  return (
    <main>
      <AdminNav />
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-text">Costs and latency</h1>
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3" aria-label="Date range">
          <div>
            <label htmlFor={fromId} className="text-sm font-semibold text-text">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={draft.from ?? ''}
              onChange={(e) => {
                setDraft((d) => ({ ...d, from: e.target.value }));
              }}
              className="mt-1 block min-h-11 rounded-lg border-2 border-border bg-surface px-3 text-text"
            />
          </div>
          <div>
            <label htmlFor={toId} className="text-sm font-semibold text-text">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={draft.to ?? ''}
              onChange={(e) => {
                setDraft((d) => ({ ...d, to: e.target.value }));
              }}
              aria-invalid={invalid || undefined}
              className="mt-1 block min-h-11 rounded-lg border-2 border-border bg-surface px-3 text-text"
            />
          </div>
          <button
            type="submit"
            disabled={invalid}
            className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-on-primary disabled:opacity-60"
          >
            Show
          </button>
          {invalid && (
            <p role="alert" className="w-full text-sm text-danger">
              The start date must be on or before the end date.
            </p>
          )}
        </form>

        <section aria-labelledby="cost-title" className="space-y-3">
          <h2 id="cost-title" className="text-lg font-bold text-text">
            AI cost
          </h2>
          <CostTable range={range} />
        </section>
        <section aria-labelledby="latency-title" className="space-y-3">
          <h2 id="latency-title" className="text-lg font-bold text-text">
            Latency
          </h2>
          <LatencyTable range={range} />
        </section>
      </div>
    </main>
  );
}
