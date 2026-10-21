export interface OnboardingValues {
  email: string;
  learningGoals: string;
  skillCategory: string;
  currentState: string;
  learningStyle: string;
  preferredContent: string;
}

export type FieldName = keyof OnboardingValues;

const labels: Record<FieldName, string> = {
  email: 'Email Address',
  learningGoals: 'Learning Goals',
  skillCategory: 'Skill Category',
  currentState: 'Current Skill Level',
  learningStyle: 'Learning Pace',
  preferredContent: 'Preferred Content Type',
};

export function validateField(name: FieldName, value: string): string {
  if (!value.trim()) return `${labels[name]} is required`;
  if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Please enter a valid email address';
  }
  if (name === 'learningGoals' && value.trim().length < 10) {
    return `${labels[name]} must be at least 10 characters`;
  }
  return '';
}
