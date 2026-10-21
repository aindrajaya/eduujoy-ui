import { ChartColumn } from 'lucide-react';

// Empty state until U10 renders the Dreyfus x Bloom grid from GET /v1/progress.
export default function ProgressPage() {
  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">Progress</h1>
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <ChartColumn className="mb-3 h-8 w-8 text-gray-500" aria-hidden="true" />
        <p className="text-gray-600">
          Finish your first checkpoint to see your progress grid here.
        </p>
      </div>
    </div>
  );
}
