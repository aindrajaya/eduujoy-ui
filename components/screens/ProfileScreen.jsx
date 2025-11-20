/**
 * Profile Screen Component
 */
'use client';

import { Target, BarChart3, Layers, Clock, Droplet, Tv } from 'lucide-react';

export default function ProfileScreen({ data, userInfo }) {
  const profileItems = [
    { icon: Target, label: 'Main Goal', value: data.goal },
    { icon: BarChart3, label: 'Current Level', value: data.current_level },
    { icon: Layers, label: 'Focus Area', value: data.focus_area },
    { icon: Clock, label: 'Session Time', value: data.session_duration },
    { icon: Droplet, label: 'Learning Pace', value: data.learning_pace },
    { icon: Tv, label: 'Content', value: data.content_preference },
  ];

  return (
    <div className="p-4 md:p-6 animate-fadeIn">
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-indigo-500 text-white flex items-center justify-center text-2xl md:text-4xl font-bold shadow-lg mb-3">
          {userInfo?.name ? userInfo.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD'}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{userInfo?.name || 'Jane Doe'}</h2>
        <p className="text-gray-600 text-sm md:text-base">{userInfo?.email || 'jane.doe@example.com'}</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4">
          Your Learning Profile
        </h3>
        <div className="space-y-3">
          {profileItems.map((item, index) => (
            <div key={index} className="flex items-center">
              <item.icon className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-gray-500 block">{item.label}</span>
                <p className="font-semibold text-gray-900 text-sm break-words">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
