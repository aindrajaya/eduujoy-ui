/**
 * Action Plan Card Component
 */
'use client';

import { Zap } from 'lucide-react';

export default function ActionPlanCard({ plan }) {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-4 md:p-5 rounded-xl shadow-xl">
      <div className="flex items-center mb-3">
        <Zap className="w-6 h-6 mr-3" />
        <h3 className="text-lg md:text-xl font-bold">Your Action Plan</h3>
      </div>
      <ul className="space-y-2 list-disc list-inside text-indigo-100 text-sm md:text-base">
        <li>
          <strong>Quick Start:</strong> {plan.quick_start}
        </li>
        <li>
          <strong>Daily Routine:</strong> {plan.daily_routine}
        </li>
        <li>
          <strong>Tracking:</strong> {plan.progress_tracking}
        </li>
      </ul>
    </div>
  );
}
