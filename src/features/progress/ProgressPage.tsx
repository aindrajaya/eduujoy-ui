import { ChartColumn } from 'lucide-react';

// Empty state until U10 renders the Dreyfus x Bloom grid from GET /v1/progress.
export default function ProgressPage() {
  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-text md:text-3xl">Progress</h1>
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border p-8 text-center">
        <ChartColumn className="mb-3 h-8 w-8 text-text-muted" aria-hidden="true" />
        <p className="text-text-muted">
          Finish your first checkpoint to see your progress grid here.
        </p>
      </div>
    </div>
  );
}
