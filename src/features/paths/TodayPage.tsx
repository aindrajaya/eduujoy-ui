import { demoActionPlan, demoModules, demoProfile } from '@/fixtures/demo';
import StickyActionBar from '@/ui/StickyActionBar';
import LearningPath from './components/LearningPath';

// Static props for U0a; U8 switches to the active path from the API.
export default function TodayPage() {
  const next = demoModules[0];
  return (
    <>
      <LearningPath
        focusArea={demoProfile.focusArea}
        actionPlan={demoActionPlan}
        modules={demoModules}
      />
      {next && (
        <StickyActionBar
          label={`Continue: Module ${next.number}`}
          to={`/steps/${next.number}`}
          aboveTabs
        />
      )}
    </>
  );
}
