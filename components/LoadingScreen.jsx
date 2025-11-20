/**
 * Loading Screen Component
 */
'use client';

import { Brain } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-600 text-white p-6">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
        <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
          <Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mt-8 text-center">Analyzing your goals...</h2>
      <p className="text-lg text-indigo-100 mt-2 text-center">
        Crafting your personalized learning journey!
      </p>
    </div>
  );
}
