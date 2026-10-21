import {
  ArrowLeft,
  ArrowRight,
  Book,
  BookOpen,
  Clock,
  Layers,
  MousePointerClick,
  Youtube,
} from 'lucide-react';
import { Link } from 'react-router';
import type { ModuleResource, PathModule } from '@/features/paths/types';
import { safeExternalUrl } from '@/lib/url';

function ResourceIcon({ type }: { type: string }) {
  const props = { className: 'h-5 w-5', 'aria-hidden': true } as const;
  switch (type.toLowerCase()) {
    case 'youtube':
      return <Youtube {...props} className={`${props.className} text-red-600`} />;
    case 'course':
      return <BookOpen {...props} className={`${props.className} text-blue-600`} />;
    case 'practice':
      return <MousePointerClick {...props} className={`${props.className} text-green-700`} />;
    case 'article/tutorial':
      return <Book {...props} className={`${props.className} text-purple-600`} />;
    default:
      return <Layers {...props} className={`${props.className} text-gray-500`} />;
  }
}

function ResourceBody({ resource }: { resource: ModuleResource }) {
  return (
    <>
      <div className="mb-2 flex items-center">
        <ResourceIcon type={resource.type} />
        <span className="ml-2 text-sm font-bold text-gray-600 uppercase">{resource.type}</span>
      </div>
      <h3 className="font-semibold text-gray-900">{resource.name}</h3>
      <p className="mt-1 text-sm text-gray-600">{resource.description}</p>
    </>
  );
}

const cardClass = 'block rounded-lg border border-gray-100 bg-white p-4 shadow';

// YouTube resources are plain links here; the YouTubeEmbed facade arrives in U8.
function ResourceCard({ resource }: { resource: ModuleResource }) {
  const href = safeExternalUrl(resource.link);
  if (!href) {
    return (
      <div className={cardClass}>
        <ResourceBody resource={resource} />
        {resource.meta && <p className="mt-3 text-xs text-gray-600">{resource.meta}</p>}
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cardClass} transition-shadow duration-200 hover:shadow-md`}
    >
      <ResourceBody resource={resource} />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-600">{resource.meta}</span>
        <ArrowRight className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </div>
    </a>
  );
}

export interface ModuleDetailProps {
  module: PathModule;
  backTo: string;
  backLabel?: string;
}

export default function ModuleDetail({
  module,
  backTo,
  backLabel = 'Back to Path',
}: ModuleDetailProps) {
  return (
    <main className="animate-fade-in p-4 pt-10 md:p-6">
      <Link
        to={backTo}
        className="group mb-4 inline-flex min-h-11 items-center font-semibold text-indigo-700 hover:text-indigo-800"
      >
        <ArrowLeft
          className="mr-2 h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1"
          aria-hidden="true"
        />
        {backLabel}
      </Link>

      <p className="text-sm font-semibold text-indigo-700 uppercase">Module {module.number}</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">{module.title}</h1>
      <p className="mt-2 mb-6 text-base text-gray-600">{module.objective}</p>

      <div className="mb-6 flex items-center rounded-lg bg-indigo-50 p-4">
        <Clock className="mr-3 h-5 w-5 flex-shrink-0 text-indigo-700" aria-hidden="true" />
        <span className="text-sm font-medium text-indigo-900">Duration: {module.duration}</span>
      </div>

      <h2 className="mb-4 text-lg font-bold text-gray-800 md:text-xl">Resources</h2>
      {module.resources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-600">
          No resources for this module yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {module.resources.map((resource) => (
            <li key={`${resource.type}-${resource.name}`}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
