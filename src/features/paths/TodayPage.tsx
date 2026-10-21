import { demoActionPlan, demoModules, demoProfile } from '@/fixtures/demo';
import LearningPath from './components/LearningPath';

// Static props for U0a; U8 switches to the active path from the API.
export default function TodayPage() {
  return (
    <LearningPath
      focusArea={demoProfile.focusArea}
      actionPlan={demoActionPlan}
      modules={demoModules}
    />
  );
}
