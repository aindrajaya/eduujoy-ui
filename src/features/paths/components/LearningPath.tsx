import ActionPlanCard from '@/features/steps/components/ActionPlanCard';
import type { ActionPlan, PathModule } from '../types';
import ModuleNode from './ModuleNode';

export interface LearningPathProps {
  focusArea: string;
  actionPlan: ActionPlan;
  modules: PathModule[];
  /** Builds the link target for a module; defaults to /steps/:number. */
  moduleHref?: (module: PathModule) => string;
}

const defaultHref = (m: PathModule) => `/steps/${m.number}`;

export default function LearningPath({
  focusArea,
  actionPlan,
  modules,
  moduleHref = defaultHref,
}: LearningPathProps) {
  return (
    <div className="animate-fade-in p-4 md:p-6">
      <header className="mb-6">
        <p className="text-lg font-semibold text-green-700">Your Learning Path</p>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{focusArea}</h1>
      </header>

      <ActionPlanCard plan={actionPlan} />

      <section className="mt-8" aria-labelledby="modules-title">
        <h2 id="modules-title" className="mb-4 text-lg font-bold text-gray-800 md:text-xl">
          Your Modules
        </h2>
        {modules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
            No modules yet. Your path will appear here once it is generated.
          </p>
        ) : (
          <ol className="relative border-l-4 border-dashed border-gray-200 pl-6">
            {modules.map((module) => (
              <ModuleNode key={module.number} module={module} to={moduleHref(module)} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
