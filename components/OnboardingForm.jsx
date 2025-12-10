/**
 * Onboarding Form Component
 * Enhanced with SEO, accessibility, and performance optimizations
 */
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  User,
  Mail,
  Target,
  TrendingUp,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Play,
  Briefcase
} from 'lucide-react';

export default function OnboardingForm({
  formData,
  handleInputChange,
  handleSubmit,
  onRequestIdGenerated,
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashAnimation, setSplashAnimation] = useState('enter');
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default values for learning goals and preferred content
  const defaultFormData = useMemo(() => ({
    email: formData.email || '',
    learningGoals: formData.learningGoals || '',
    skillCategory: formData.skillCategory || '',
    currentState: formData.currentState || '',
    learningStyle: formData.learningStyle || '',
    preferredContent: formData.preferredContent || ''
  }), [formData]);

  // Use default form data for validation and display
  const currentFormData = { ...formData, ...defaultFormData };

  // Auto-transition from splash to form after 3 seconds
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setSplashAnimation('exit');
        setTimeout(() => setShowSplash(false), 600); // Wait for exit animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Manual transition handler
  const handleStartOnboarding = useCallback(() => {
    setSplashAnimation('exit');
    setTimeout(() => setShowSplash(false), 600);
  }, []);

  // Memoized validation rules for performance
  const validationRules = useMemo(() => ({
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    learningGoals: { required: true, minLength: 10 },
    skillCategory: { required: true },
    currentState: { required: true },
    learningStyle: { required: true },
    preferredContent: { required: true }
  }), []);

  // Validate individual field
  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && !value.trim()) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must be at least ${rules.minLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      if (name === 'email') return 'Please enter a valid email address';
      if (name === 'name') return 'Name can only contain letters and spaces';
      return 'Invalid format';
    }

    return '';
  }, [validationRules]);

  
  const selectFields = useMemo(() => [
    {
      name: 'skillCategory',
      label: 'Skill Category',
      icon: Briefcase,
      options: [
        { value: 'designer', label: 'Designer' },
        { value: 'programmer', label: 'Programmer' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'business', label: 'Business' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'education', label: 'Education' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'engineering', label: 'Engineering' },
        { value: 'other', label: 'Other' }
      ],
      disabled: false
    },
    {
      name: 'currentState',
      label: 'Current Skill Level',
      icon: TrendingUp,
      options: [
        { value: 'beginner', label: 'Beginner - Just starting out' },
        { value: 'intermediate', label: 'Intermediate - Some experience' },
        { value: 'advanced', label: 'Advanced - Experienced professional' }
      ],
      disabled: false
    },
    {
      name: 'learningStyle',
      label: 'Learning Pace',
      icon: Clock,
      options: [
        { value: 'slow', label: 'Slow & Steady - Take your time' },
        { value: 'moderate', label: 'Moderate Pace - Balanced approach' },
        { value: 'fast', label: 'Fast Paced - Quick learning bursts' }
      ],
      disabled: false
    },
    {
      name: 'preferredContent',
      label: 'Preferred Content Type',
      icon: BookOpen,
      options: [
        { value: 'audioVisual', label: 'Audio Visual - Videos & podcasts' },
        { value: 'reading', label: 'Reading - Articles & books' },
        { value: 'interactive', label: 'Interactive - Hands-on projects' }
      ],
      disabled: false
    }
  ], []);

    // Form fields configuration for better maintainability
  const formFields = useMemo(() => [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      icon: Mail,
      placeholder: 'your.email@example.com',
      required: true,
      autoComplete: 'email',
      disabled: false
    },
    {
      name: 'learningGoals',
      label: 'Learning Goals',
      type: 'text',
      icon: Target,
      placeholder: 'e.g., Upgrade career growth in Product Design',
      required: true,
      autoComplete: 'off',
      disabled: false
    }
  ], []);

  // Enhanced input change handler with validation
  const handleInputChangeEnhanced = useCallback((e) => {
    const { name, value } = e.target;

    // Find if this field is disabled
    const allFields = [...formFields, ...selectFields];
    const fieldConfig = allFields.find(f => f.name === name);

    if (fieldConfig?.disabled) {
      return; // Don't allow changes to disabled fields
    }

    handleInputChange(e);

    // Real-time validation for non-disabled fields
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [handleInputChange, formFields, selectFields, validateField]);

  // Enhanced submit handler with webhook POST
  const handleSubmitEnhanced = useCallback(async (e) => {
    e.preventDefault();

    // Validate all non-disabled fields
    const newErrors = {};
    [...formFields, ...selectFields].forEach(field => {
      if (!field.disabled) {
        const error = validateField(field.name, currentFormData[field.name]);
        if (error) newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Focus first error field
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorField);
      element?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate unique request ID for this submission (email + timestamp)
      const newRequestId = `${currentFormData.email}_${Date.now()}`;
      console.log('🆔 Generated requestId:', newRequestId);

      // Notify parent about the requestId
      if (onRequestIdGenerated) {
        onRequestIdGenerated(newRequestId);
      }

      // Prepare form data for webhook (only non-disabled fields)
      const webhookData = {};
      [...formFields, ...selectFields].forEach(field => {
        if (!field.disabled) {
          webhookData[field.name] = currentFormData[field.name];
        }
      });

      // Add requestId to webhook data so n8n can use it when calling back
      webhookData.requestId = newRequestId;
      console.log('📤 Sending data to n8n with requestId:', newRequestId);

      // Send POST request to both the default n8n webhook and an additional one
      const DEFAULT_N8N_WEBHOOK = 'https://n8n-oo1yqkmi2l7g.blueberry.sumopod.my.id/webhook/826acb2a-ac8d-496e-828e-1c0791d1446d';
      const EXTRA_N8N_WEBHOOK = 'https://n8n-oo1yqkmi2l7g.blueberry.sumopod.my.id/webhook/73928a59-c6df-4fc6-b06d-ef0c7f02481a';

      // Send to default webhook and await its response (drives app flow).
      const defaultResponsePromise = fetch(DEFAULT_N8N_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      // Fire-and-forget the extra webhook but catch errors so they don't create unhandled rejections.
      const extraResponsePromise = fetch(EXTRA_N8N_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      }).catch((err) => console.warn('Extra n8n webhook error:', err));

      const response = await defaultResponsePromise;

      if (!response.ok) {
        throw new Error(`Webhook request failed with status ${response.status}`);
      }

      // Optionally handle extra webhook result asynchronously (already caught above).
      extraResponsePromise.catch(() => {});

      console.log('✅ Successfully sent to default n8n webhook (and attempted extra webhook)');

      // Call original handleSubmit if provided
      if (handleSubmit) {
        await handleSubmit(e);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Failed to submit form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentFormData, formFields, selectFields, validateField, handleSubmit]);

  // Splash Screen Component
  if (showSplash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-pink-300/30 rounded-full blur-2xl animate-ping" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Main Content */}
        <div className={`text-center z-10 transition-all duration-700 ${splashAnimation === 'exit' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-8 shadow-2xl animate-bounce">
            <Sparkles className="w-12 h-12 text-white" aria-hidden="true" />
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              EduJoy
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Your personalized learning journey starts here. Let's create something amazing together.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleStartOnboarding}
            className="inline-flex items-center gap-3 bg-white text-indigo-600 font-bold py-4 px-8 rounded-full shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            aria-label="Start your learning journey"
          >
            <span className="text-lg">Get Started</span>
            <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
          </button>

          {/* Auto-continue indicator */}
          <p className="text-white/70 text-sm mt-6 animate-pulse">
            Auto-continuing in a few seconds...
          </p>
        </div>

        {/* Custom CSS for animations */}
        <style jsx>{`
          @keyframes bounce-gentle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-bounce-gentle {
            animation: bounce-gentle 2s infinite;
          }
        `}</style>
      </div>
    );
  }

  // Main Form Component
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4"
      role="main"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <header className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <h1
            id="onboarding-title"
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4"
          >
            Let's Get Started!
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
            Tell us about yourself and we'll craft the perfect path to achieve your goals.
          </p>
        </header>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slideUp">
          <form
            onSubmit={handleSubmitEnhanced}
            className="p-8 md:p-10"
            noValidate
            aria-labelledby="form-title"
          >
            <h2 id="form-title" className="sr-only">Learning Profile Setup Form</h2>

            {/* Progress Indicator */}
            <div className="mb-8" aria-hidden="true">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                <span className="text-sm text-gray-600">6/6 steps</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full w-full transition-all duration-500"></div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Text Input Fields */}
              {formFields.map((field, index) => {
                const Icon = field.icon;
                const hasError = errors[field.name];
                const isFocused = focusedField === field.name;

                return (
                  <div
                    key={field.name}
                    className={`relative animate-fadeIn`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                      {field.label}
                      {field.required && <span className="text-red-500" aria-label="required">*</span>}
                    </label>

                    <div className="relative">
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={currentFormData[field.name] || ''}
                        onChange={handleInputChangeEnhanced}
                        onFocus={() => setFocusedField(field.name)}
                        onBlur={() => setFocusedField(null)}
                        disabled={field.disabled}
                        className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-200 text-sm focus:outline-none placeholder-gray-400 ${
                          field.disabled
                            ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                            : hasError
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900'
                            : isFocused
                            ? 'border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900'
                            : 'border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900'
                        }`}
                        placeholder={field.placeholder}
                        required={field.required}
                        autoComplete={field.autoComplete}
                        aria-describedby={hasError ? `${field.name}-error` : undefined}
                        aria-invalid={hasError ? 'true' : 'false'}
                      />
                      <Icon
                        className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                          field.disabled
                            ? 'text-gray-400'
                            : hasError
                            ? 'text-red-400'
                            : isFocused
                            ? 'text-indigo-500'
                            : 'text-gray-400'
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    {hasError && (
                      <div
                        id={`${field.name}-error`}
                        className="mt-2 flex items-center gap-2 text-sm text-red-600 animate-fadeIn"
                        role="alert"
                        aria-live="polite"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{hasError}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Select Fields */}
              {selectFields.map((field, index) => {
                const Icon = field.icon;
                const hasError = errors[field.name];
                const isFocused = focusedField === field.name;

                return (
                  <div
                    key={field.name}
                    className={`relative animate-fadeIn`}
                    style={{ animationDelay: `${(formFields.length + index) * 100}ms` }}
                  >
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                      {field.label}
                      <span className="text-red-500" aria-label="required">*</span>
                    </label>

                    <div className="relative">
                      <select
                        id={field.name}
                        name={field.name}
                        value={currentFormData[field.name] || ''}
                        onChange={handleInputChangeEnhanced}
                        onFocus={() => setFocusedField(field.name)}
                        onBlur={() => setFocusedField(null)}
                        disabled={field.disabled}
                        className={`w-full px-4 py-3 pl-12 pr-10 border-2 rounded-xl transition-all duration-200 text-sm focus:outline-none appearance-none bg-white placeholder-gray-400 ${
                          field.disabled
                            ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                            : hasError
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900'
                            : isFocused
                            ? 'border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900'
                            : 'border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900'
                        }`}
                        required
                        aria-describedby={hasError ? `${field.name}-error` : undefined}
                        aria-invalid={hasError ? 'true' : 'false'}
                      >
                        <option value="">Select an option...</option>
                        {field.options.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Icon
                        className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                          field.disabled
                            ? 'text-gray-400'
                            : hasError
                            ? 'text-red-400'
                            : isFocused
                            ? 'text-indigo-500'
                            : 'text-gray-400'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {hasError && (
                      <div
                        id={`${field.name}-error`}
                        className="mt-2 flex items-center gap-2 text-sm text-red-600 animate-fadeIn"
                        role="alert"
                        aria-live="polite"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{hasError}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <div className="mt-8 animate-fadeIn" style={{ animationDelay: '600ms' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-sm md:text-base ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:from-indigo-600 hover:to-purple-700'
                }`}
                aria-describedby="submit-description"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                    <span>Creating Your Learning Plan...</span>
                  </>
                ) : (
                  <>
                    <span>Generate My Learning Plan</span>
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </>
                )}
              </button>
              <p id="submit-description" className="sr-only">
                Submit this form to generate your personalized learning plan based on your responses
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="text-center mt-6 text-sm text-gray-600 animate-fadeIn" style={{ animationDelay: '700ms' }}>
          <p>Your data is secure and will only be used to create your learning experience.</p>
        </footer>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-slideUp {
          animation: slideUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
