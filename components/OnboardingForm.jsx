/**
 * Onboarding Form Component
 */
'use client';

export default function OnboardingForm({
  formData,
  handleInputChange,
  handleSubmit,
}) {
  return (
    <div className="p-6 pt-10 animate-fadeIn">
      <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
      <p className="text-gray-600 mt-2 mb-6">Tell us about your learning goals.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Learning Goals</label>
          <input
            type="text"
            name="learningGoals"
            value={formData.learningGoals}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            required
            placeholder="e.g., Upgrade career growth in Product Design"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Current Skill Level</label>
          <select
            name="currentState"
            value={formData.currentState}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Learning Pace</label>
          <select
            name="learningStyle"
            value={formData.learningStyle}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
          >
            <option value="slow">Slow & Steady</option>
            <option value="moderate">Moderate Pace</option>
            <option value="fast">Fast Paced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Preferred Content</label>
          <select
            name="preferredContent"
            value={formData.preferredContent}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
          >
            <option value="audioVisual">Audio Visual</option>
            <option value="reading">Reading</option>
            <option value="interactive">Interactive</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 text-sm md:text-base"
        >
          Generate My Learning Plan
        </button>
      </form>
    </div>
  );
}
