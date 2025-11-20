/**
 * Pro Tips Screen Component
 */
'use client';

import { Lightbulb } from 'lucide-react';

export default function ProTipsScreen({ data }) {
  return (
    <div className="p-4 md:p-6 animate-fadeIn">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
        Pro Tips
      </h1>
      <div className="space-y-4">
        {data.map((tip, index) => (
          <div
            key={index}
            className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3"
          >
            <Lightbulb className="w-5 h-5 text-yellow-500 mr-1 mt-1 flex-shrink-0" />
            <p
              className="text-gray-800 text-sm md:text-base"
              dangerouslySetInnerHTML={{
                __html: tip.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
              }}
            ></p>
          </div>
        ))}
      </div>
    </div>
  );
}
