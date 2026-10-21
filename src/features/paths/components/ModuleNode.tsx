import { CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { PathModule } from '../types';

export interface ModuleNodeProps {
  module: PathModule;
  to: string;
}

export default function ModuleNode({ module, to }: ModuleNodeProps) {
  return (
    <li className="relative mb-10">
      <div
        className="absolute top-0 -left-[2.6rem] flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-green-600 shadow"
        aria-hidden="true"
      >
        <CircleCheck className="h-4 w-4 text-white" />
      </div>
      <Link
        to={to}
        className="block w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-5"
      >
        <div className="mb-2 flex flex-col items-start justify-between gap-2 sm:flex-row">
          <span className="text-xs font-semibold text-indigo-700 uppercase">
            Module {module.number}
          </span>
          <span className="flex-shrink-0 text-xs font-medium text-gray-600">{module.duration}</span>
        </div>
        <h3 className="text-base font-bold text-gray-900 md:text-lg">{module.title}</h3>
      </Link>
    </li>
  );
}
