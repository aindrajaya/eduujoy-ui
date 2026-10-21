import { ChartColumn, Clock, Droplet, Layers, Target, Tv } from 'lucide-react';
import type { LearnerProfile, UserInfo } from '../types';

export interface ProfileProps {
  profile: LearnerProfile;
  user: UserInfo;
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || '?';
}

export default function Profile({ profile, user }: ProfileProps) {
  const items = [
    { icon: Target, label: 'Main Goal', value: profile.goal },
    { icon: ChartColumn, label: 'Current Level', value: profile.currentLevel },
    { icon: Layers, label: 'Focus Area', value: profile.focusArea },
    { icon: Clock, label: 'Session Time', value: profile.sessionDuration },
    { icon: Droplet, label: 'Learning Pace', value: profile.learningPace },
    { icon: Tv, label: 'Content', value: profile.contentPreference },
  ];

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <header className="mb-6 flex flex-col items-center">
        <div
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg md:h-24 md:w-24 md:text-4xl"
          aria-hidden="true"
        >
          {initials(user.name)}
        </div>
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{user.name}</h1>
        <p className="text-base text-gray-600">{user.email}</p>
      </header>

      <section aria-labelledby="profile-title" className="rounded-lg bg-gray-50 p-4">
        <h2 id="profile-title" className="mb-4 text-base font-bold text-gray-800 md:text-lg">
          Your Learning Profile
        </h2>
        <dl className="space-y-3">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="grid grid-cols-[1.25rem_1fr] items-center gap-x-3">
              <Icon className="row-span-2 h-5 w-5 text-indigo-600" aria-hidden="true" />
              <dt className="text-xs text-gray-600">{label}</dt>
              <dd className="min-w-0 text-sm font-semibold break-words text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
