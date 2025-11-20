/**
 * Loading Screen Component
 */
'use client';

import { Brain } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements - Same as splash screen */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-pink-300/30 rounded-full blur-2xl animate-ping" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center text-white p-6 relative z-10">
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
    </div>
  );
}
