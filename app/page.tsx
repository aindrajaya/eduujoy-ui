/**
 * Main page component
 * Implements full learning platform with onboarding, loading, and dashboard
 */
'use client';

import { useState, useEffect } from 'react';
import OnboardingForm from '@/components/OnboardingForm';
import LoadingScreen from '@/components/LoadingScreen';
import Dashboard from '@/components/Dashboard';
import BottomNav from '@/components/BottomNav';
import ModuleDetailScreen from '@/components/screens/ModuleDetailScreen';

// Default fallback learning data structure
const defaultLearningData = {
  profile_summary: {
    goal: 'Upgrade career growth in Product Design (UI/UX)',
    current_level: 'Intermediate',
    focus_area: 'Product Design (UI/UX)',
    session_duration: '20 Minutes',
    best_learning_time: 'Morning',
    learning_pace: 'Slow',
    content_preference: 'Audio Visual',
  },
  learning_path: [],
  action_plan: {
    quick_start: 'Begin with Module 1 this week.',
    daily_routine: 'Set an alarm for 20 minutes each morning.',
    progress_tracking: 'Keep a simple journal.',
  },
  pro_tips: [],
};

export default function Page() {
  const [screen, setScreen] = useState('onboarding'); // onboarding, loading, dashboard
  const [currentView, setCurrentView] = useState('learn'); // learn, profile, tips
  const [selectedModule, setSelectedModule] = useState(null);
  const [learningData, setLearningData] = useState(defaultLearningData);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataId, setDataId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: 'jane.doe@example.com',
    skillCategory: 'designer',
    learningStyle: 'slow',
    preferredContent: 'audioVisual',
    learningGoals: 'Upgrade career growth in Product Design (UI/UX)',
    currentState: 'intermediate',
  });

  /**
   * Handle form input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value } = target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Transform form data into profile summary format
   */
  const getProfileSummary = () => {
    const levelMap: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced'
    };

    const paceMap: Record<string, string> = {
      slow: 'Slow & Steady',
      moderate: 'Moderate Pace',
      fast: 'Fast Paced'
    };

    const contentMap: Record<string, string> = {
      audioVisual: 'Audio Visual',
      reading: 'Reading',
      interactive: 'Interactive'
    };

    return {
      goal: formData.learningGoals || 'Upgrade career growth in Product Design (UI/UX)',
      current_level: levelMap[formData.currentState] || 'Intermediate',
      focus_area: 'Product Design (UI/UX)',
      session_duration: '20 Minutes',
      best_learning_time: 'Morning', // Could be made dynamic later
      learning_pace: paceMap[formData.learningStyle] || 'Slow',
      content_preference: contentMap[formData.preferredContent] || 'Audio Visual',
    };
  };

  /**
   * Get user info for profile display
   */
  const getUserInfo = () => ({
    name: formData.email.split('@')[0] || 'User',
    email: formData.email || 'user@example.com',
  });

  /**
   * Poll for learning data from callback webhook
   */
  const pollForLearningData = async (id: string, maxAttempts: number = 120) => {
    let attempts = 0;

    const poll = async (): Promise<any | null> => {
      attempts++;

      try {
        // Use relative URL (will work on both localhost and Vercel)
        const url = `/api/learning-callback?dataId=${encodeURIComponent(id)}`;
        console.log(`[Attempt ${attempts}] Polling: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`[Attempt ${attempts}] Response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Response data received:', data);
          
          if (data && data.learning_path && data.learning_path.length > 0) {
            console.log(`✅ Learning data received! Modules: ${data.learning_path.length}`);
            return data; // Return the actual data
          } else {
            console.log('⚠️ Response OK but no valid learning_path');
          }
        } else if (response.status === 404) {
          // Data not ready yet, continue polling
          console.log(`⏳ Data not found yet (404) - waiting... (attempt ${attempts}/${maxAttempts})`);
        } else if (response.status === 500) {
          // Server error
          const errorData = await response.text();
          console.error(`❌ Server error (500):`, errorData);
        } else {
          console.error(`❌ Unexpected status: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Poll error (attempt ${attempts}):`, error);
      }

      // If we haven't reached max attempts, wait and try again
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before next poll
        return poll();
      }

      console.warn(`⚠️ Max attempts (${maxAttempts}) reached. Stopping poll.`);
      return null;
    };

    return poll();
  };

  /**
   * Handle form submission - Form goes to n8n, we wait for callback
   * Note: requestId is generated in OnboardingForm before calling this
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Use the requestId that was already set
    const id = requestId || `${formData.email}_${Date.now()}`;
    setDataId(id);

    console.log('📤 Form submitted to n8n');
    console.log(`🆔 Request ID: ${id}`);
    console.log('⏳ Waiting for n8n to process and send data back...');

    setScreen('loading');
    setIsLoadingData(true);

    try {
      // Poll for learning data (will be sent by n8n callback with this specific requestId)
      const receivedData = await pollForLearningData(id);

      if (receivedData) {
        // Data received from n8n callback
        console.log('Setting learning data and transitioning to dashboard...');
        setLearningData(receivedData);
        console.log('🎉 Going to dashboard with received data!');
        setScreen('dashboard');
      } else {
        // Timeout - use default data
        console.warn('⚠️ No data received from n8n within timeout. Using default data.');
        setLearningData(defaultLearningData);
        setScreen('dashboard');
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      setLearningData(defaultLearningData);
      setScreen('dashboard');
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * Render appropriate screen based on state
   */
  const renderScreen = () => {
    if (selectedModule && screen === 'dashboard') {
      return (
        <ModuleDetailScreen
          module={selectedModule}
          onBack={() => setSelectedModule(null)}
        />
      );
    }

    switch (screen) {
      case 'onboarding':
        return (
          <OnboardingForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            onRequestIdGenerated={setRequestId}
          />
        );
      case 'loading':
        return <LoadingScreen />;
      case 'dashboard':
        return (
          <Dashboard
            currentView={currentView}
            setCurrentView={setCurrentView}
            data={{
              ...learningData,
              profile_summary: getProfileSummary()
            }}
            onModuleSelect={setSelectedModule}
            userInfo={getUserInfo()}
          />
        );
      default:
        return (
          <OnboardingForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            onRequestIdGenerated={setRequestId}
          />
        );
    }
  };

  return (
    <div
      className="font-sans antialiased bg-gray-100 min-h-screen"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      <div className="relative w-full max-w-md mx-auto min-h-screen bg-white shadow-lg overflow-hidden">
        {renderScreen()}
        {screen === 'dashboard' && !selectedModule && (
          <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
        )}
      </div>
    </div>
  );
}
