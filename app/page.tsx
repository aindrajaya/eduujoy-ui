/**
 * Main page component
 * Implements full learning platform with onboarding, loading, and dashboard
 */
'use client';

import { useState } from 'react';
import OnboardingForm from '@/components/OnboardingForm';
import LoadingScreen from '@/components/LoadingScreen';
import Dashboard from '@/components/Dashboard';
import BottomNav from '@/components/BottomNav';
import ModuleDetailScreen from '@/components/screens/ModuleDetailScreen';

// Hardcoded learning data - in production, this would come from AI
const learningData = {
  profile_summary: {
    goal: 'Upgrade career growth in Product Design (UI/UX)',
    current_level: 'Intermediate',
    focus_area: 'Product Design (UI/UX)',
    session_duration: '20 Minutes',
    best_learning_time: 'Morning',
    learning_pace: 'Slow',
    content_preference: 'Audio Visual',
  },
  learning_path: [
    {
      module_number: 1,
      module_title: 'Mastering Advanced UX Research & Strategy',
      duration: 'Week 1-2 (10-14 days)',
      objective:
        'Deepen your understanding of qualitative and quantitative research methods, learn to derive strategic insights, and influence product decisions based on data.',
      resources: [
        {
          type: 'YouTube',
          name: 'Step-by-step user research guide I use at Google as a UX designer',
          link: 'https://www.youtube.com/watch?v=TRaNiRZqXwY',
          duration_estimate: '~10 minutes per segment',
          rationale:
            'This Nielsen Norman Group video breaks down various research methods with clear explanations and visual examples, perfect for a slow, audio-visual learner.',
        },
        {
          type: 'Course',
          name: 'Conducting UX Research (Coursera)',
          link: 'https://www.coursera.org/learn/ux-research-google',
          platform: 'Coursera (Google UX Design Professional Certificate)',
          duration_estimate: 'Aim for 20 minutes daily; self-paced.',
          rationale: 'Provides a structured, in-depth look at the entire UX research process.',
        },
        {
          type: 'Practice',
          name: 'Research Review & Critique',
          link: '#',
          rationale:
            'Identify a well-known app or website and dedicate 5-10 minutes analyzing its features.',
        },
      ],
    },
    {
      module_number: 2,
      module_title: 'Elevating UI Design & Interaction Patterns',
      duration: 'Week 3-4 (10-14 days)',
      objective:
        'Refine your UI design skills, focusing on advanced visual hierarchy, accessibility best practices, and design systems.',
      resources: [
        {
          type: 'YouTube',
          name: ' Introduction to design systems',
          link: 'https://www.youtube.com/watch?v=YLo6g58vUm0',
          duration_estimate: '~15 minutes',
          rationale:
            'Design systems are crucial for career growth. This video provides a clear, visual introduction.',
        },
        {
          type: 'Course',
          name: 'UX Design: Accessibility',
          link: 'https://www.linkedin.com/learning/ux-design-accessibility',
          platform: 'LinkedIn Learning',
          duration_estimate: '20 minutes daily',
          rationale:
            'Accessibility is fundamental. This course offers practical, visual guidance on designing inclusive experiences.',
        },
        {
          type: 'Practice',
          name: 'UI Pattern Dissection',
          link: '#',
          rationale: 'Choose a complex UI pattern and spend 10 minutes daily analyzing examples.',
        },
      ],
    },
    {
      module_number: 3,
      module_title: 'Crafting Compelling Portfolio Case Studies',
      duration: 'Week 5-6 (10-14 days)',
      objective:
        'Learn to articulate your design process, decisions, and impact through compelling case studies.',
      resources: [
        {
          type: 'YouTube',
          name: 'How To Write A Great UX Case Study',
          link: 'https://www.youtube.com/watch?v=ebPLYcAx__s',
          duration_estimate: '~13 minutes',
          rationale:
            'This video offers practical advice and structured approach to writing impactful UX case studies.',
        },
        {
          type: 'Article/Tutorial',
          name: 'The Ultimate Guide to Creating a UX Portfolio',
          link: 'https://www.careerfoundry.com/en/blog/ux-design/how-to-create-a-ux-portfolio-guide/',
          platform: 'CareerFoundry Blog',
          duration_estimate: 'Skim at own pace',
          rationale: 'Complements the video with detailed examples and sections to include.',
        },
        {
          type: 'Practice',
          name: 'Case Study Outline & Storytelling',
          link: '#',
          rationale: 'Select one of your existing projects and outline its case study.',
        },
      ],
    },
    {
      module_number: 4,
      module_title: 'Effective Collaboration & Stakeholder Management',
      duration: 'Week 7-8 (10-14 days)',
      objective:
        'Enhance your communication, presentation, and collaboration skills for cross-functional teams.',
      resources: [
        {
          type: 'YouTube',
          name: 'How I Conduct A Stakeholder Interview (UX Framework)',
          link: 'https://www.youtube.com/watch?v=uE3RH1xZFAA',
          duration_estimate: '~11 minutes',
          rationale:
            'Successfully presenting your designs is vital for influence and career growth.',
        },
        {
          type: 'Course',
          name: 'Becoming an Effective Communicator',
          link: 'https://www.linkedin.com/learning/becoming-an-effective-communicator',
          platform: 'LinkedIn Learning',
          duration_estimate: '20 minutes daily',
          rationale:
            'Strong communication is crucial for interacting with product managers, engineers, and leadership.',
        },
        {
          type: 'Practice',
          name: 'Design Critique & Feedback Loop',
          link: '#',
          rationale: 'Observe a recent team meeting and reflect on feedback dynamics.',
        },
      ],
    },
    {
      module_number: 5,
      module_title: 'Interview Strategies & Career Advancement',
      duration: 'Week 9-10 (10-14 days)',
      objective:
        'Prepare for intermediate-to-senior level UI/UX interviews and plan career moves.',
      resources: [
        {
          type: 'YouTube',
          name: 'How to Present a UX Case Study in a Job Interview',
          link: 'https://www.youtube.com/watch?v=ZVZfWfqmRBY',
          duration_estimate: '~10 minutes',
          rationale:
            'Direct insights from a recruiter guide your preparation for common interview questions.',
        },
        {
          type: 'YouTube',
          name: 'Product Design Interview: Portfolio Walkthrough',
          link: 'https://www.youtube.com/watch?v=vVj_Qx-2B-c',
          duration_estimate: '~17 minutes',
          rationale: 'A portfolio walkthrough is often the core of a product design interview.',
        },
        {
          type: 'Practice',
          name: 'Mock Portfolio Presentation',
          link: '#',
          rationale:
            'Record yourself presenting one of your key portfolio case studies.',
        },
      ],
    },
  ],
  action_plan: {
    quick_start:
      'Begin with Module 1 this week. Commit to watching the first YouTube video.',
    daily_routine:
      'Set an alarm for 20 minutes each morning. Use first 5-10 minutes to review notes, next 10-15 minutes for resources.',
    progress_tracking:
      'Keep a simple journal. After each session, jot down what you learned and your next step.',
  },
  pro_tips: [
    "<strong>Embrace the 'Slow' Pace:</strong> Don't rush! Take detailed notes, re-watch segments, and truly internalize concepts.",
    "<strong>Consistency is Key:</strong> 20 minutes every morning will yield far greater results than sporadic long sessions.",
    "<strong>Active Learning:</strong> Don't just consume. Pause videos, try concepts in design tools, critique existing designs.",
  ],
};

export default function Page() {
  const [screen, setScreen] = useState('onboarding'); // onboarding, loading, dashboard
  const [currentView, setCurrentView] = useState('learn'); // learn, profile, tips
  const [selectedModule, setSelectedModule] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    duration: '20 minutes a day',
    learningStyle: 'slow',
    preferredContent: 'audioVisual',
    categories: ['productDesign', 'uiux'],
    learningGoals: 'Upgrade career growth in Product Design (UI/UX)',
    currentState: 'intermediate',
  });

  /**
   * Handle form input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        categories: checked
          ? [...prev.categories, value]
          : prev.categories.filter((item) => item !== value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setScreen('loading');

    // Simulate AI analysis time (2.5 seconds)
    setTimeout(() => {
      setScreen('dashboard');
    }, 2500);
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
          />
        );
      case 'loading':
        return <LoadingScreen />;
      case 'dashboard':
        return (
          <Dashboard
            currentView={currentView}
            setCurrentView={setCurrentView}
            data={learningData}
            onModuleSelect={setSelectedModule}
          />
        );
      default:
        return (
          <OnboardingForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
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
