import { Zap } from 'lucide-react';
import type { ActionPlan } from '@/features/paths/types';

export interface ActionPlanCardProps {
  plan: ActionPlan;
}

export default function ActionPlanCard({ plan }: ActionPlanCardProps) {
  return (
    <section
      aria-labelledby="action-plan-title"
      className="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-4 text-white shadow-xl md:p-5"
    >
      <div className="mb-3 flex items-center">
        <Zap className="mr-3 h-6 w-6" aria-hidden="true" />
        <h2 id="action-plan-title" className="text-lg font-bold md:text-xl">
          Your Action Plan
        </h2>
      </div>
      <ul className="list-inside list-disc space-y-2 text-base text-indigo-50">
        <li>
          <strong>Quick Start:</strong> {plan.quickStart}
        </li>
        <li>
          <strong>Daily Routine:</strong> {plan.dailyRoutine}
        </li>
        <li>
          <strong>Tracking:</strong> {plan.progressTracking}
        </li>
      </ul>
    </section>
  );
}
