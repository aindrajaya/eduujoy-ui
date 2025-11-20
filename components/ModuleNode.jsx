/**
 * Module Node Component
 */
'use client';

import { CheckCircle } from 'lucide-react';

export default function ModuleNode({ module, onSelect, isLast }) {
  return (
    <div className="mb-10">
      <div className="absolute -left-5 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow">
        <CheckCircle className="w-4 h-4 text-white" />
      </div>
      <button
        onClick={onSelect}
        className="w-full text-left p-4 md:p-5 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      >
        <div className="flex justify-between items-start mb-2 flex-col sm:flex-row gap-2">
          <span className="text-xs font-semibold uppercase text-indigo-500">
            Module {module.module_number}
          </span>
          <span className="text-xs font-medium text-gray-500 flex-shrink-0">
            {module.duration}
          </span>
        </div>
        <h3 className="text-base md:text-lg font-bold text-gray-900">
          {module.module_title}
        </h3>
      </button>
      {!isLast && <div className="absolute left-0 h-10 w-4 -ml-2.5"></div>}
    </div>
  );
}
