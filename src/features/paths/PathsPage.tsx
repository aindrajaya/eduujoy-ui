import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { demoModules, demoProfile } from '@/fixtures/demo';

// Static list for U0a; U8 renders GET /v1/paths.
export default function PathsPage() {
  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">Your Paths</h1>
      <ul className="space-y-4">
        <li>
          <Link
            to="/today"
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-lg transition-shadow hover:shadow-xl"
          >
            <span>
              <span className="block text-base font-bold text-gray-900">
                {demoProfile.focusArea}
              </span>
              <span className="text-sm text-gray-600">{demoModules.length} modules</span>
            </span>
            <ArrowRight className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </div>
  );
}
