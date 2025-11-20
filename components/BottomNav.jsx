/**
 * Bottom Navigation Component
 */
'use client';

import { BookOpen, User, Lightbulb } from 'lucide-react';

const navItems = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'tips', label: 'Pro Tips', icon: Lightbulb },
];

export default function BottomNav({ currentView, setCurrentView }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg max-w-md mx-auto">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
              currentView === item.id ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
