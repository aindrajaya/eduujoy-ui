/**
 * Module Detail Screen Component
 */
'use client';

import { ArrowLeft, ArrowRight, Clock, Youtube, BookOpen, Book, MousePointerClick, Layers } from 'lucide-react';
import VideoPlayerWithSummary from '../VideoPlayerWithSummary';
import { extractVideoId } from '@/lib/videoUtils';

/**
 * Get icon based on resource type
 */
function getIcon(type) {
  switch (type.toLowerCase()) {
    case 'youtube':
      return <Youtube className="w-5 h-5 text-red-500" />;
    case 'course':
      return <BookOpen className="w-5 h-5 text-blue-500" />;
    case 'practice':
      return <MousePointerClick className="w-5 h-5 text-green-500" />;
    case 'article/tutorial':
      return <Book className="w-5 h-5 text-purple-500" />;
    default:
      return <Layers className="w-5 h-5 text-gray-400" />;
  }
}

export default function ModuleDetailScreen({ module, onBack }) {
  return (
    <div className="p-4 md:p-6 pt-10 animate-fadeIn">
      <button
        onClick={onBack}
        className="flex items-center text-indigo-600 font-semibold mb-4 group hover:text-indigo-700"
      >
        <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
        Back to Path
      </button>

      <span className="text-sm font-semibold uppercase text-indigo-500">
        Module {module.module_number}
      </span>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
        {module.module_title}
      </h1>
      <p className="text-gray-600 mt-2 mb-6 text-sm md:text-base">
        {module.objective}
      </p>

      <div className="bg-indigo-50 p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" />
          <span className="text-sm font-medium text-indigo-800">
            Duration: {module.duration}
          </span>
        </div>
      </div>

      <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
        Resources
      </h2>
      <div className="space-y-4">
        {module.resources.map((resource, index) => (
          <div key={index}>
            {/* YouTube Resource with Player */}
            {resource.type.toLowerCase() === 'youtube' ? (
              <div className="bg-white rounded-lg shadow border border-gray-100 p-4 space-y-4">
                <div className="flex items-center mb-2">
                  {getIcon(resource.type)}
                  <span className="ml-2 text-sm font-bold uppercase text-gray-500">
                    {resource.type}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                <p className="text-sm text-gray-600">{resource.rationale}</p>

                {/* Video Player Component */}
                <VideoPlayerWithSummary
                  videoId={extractVideoId(resource.link)}
                  title={resource.name}
                />
              </div>
            ) : (
              // Other resource types as links
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-white rounded-lg shadow border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center mb-2">
                  {getIcon(resource.type)}
                  <span className="ml-2 text-sm font-bold uppercase text-gray-500">
                    {resource.type}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{resource.rationale}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">
                    {resource.platform || resource.duration_estimate}
                  </span>
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                </div>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
