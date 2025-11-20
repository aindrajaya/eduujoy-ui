/**
 * Learning Path Screen Component
 */
'use client';

import { CheckCircle, ArrowLeft } from 'lucide-react';
import ActionPlanCard from '../ActionPlanCard';
import ModuleNode from '../ModuleNode';

export default function LearningPathScreen({ data, onModuleSelect }) {
  return (
    <div className="p-4 md:p-6 animate-fadeIn">
      <header className="mb-6">
        <p className="text-lg font-semibold text-green-600">Your Learning Path</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Product Design & UI/UX
        </h1>
      </header>

      <ActionPlanCard plan={data.action_plan} />

      <div className="mt-8">
        <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
          Your Modules
        </h2>
        <div className="relative pl-6 border-l-4 border-dashed border-gray-200">
          {data.learning_path.map((module, index) => (
            <ModuleNode
              key={module.module_number}
              module={module}
              onSelect={() => onModuleSelect(module)}
              isLast={index === data.learning_path.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
