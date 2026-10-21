import { Link, useParams } from 'react-router';
import { demoModules } from '@/fixtures/demo';
import StickyActionBar from '@/ui/StickyActionBar';
import ModuleDetail from './components/ModuleDetail';

// Static props for U0a; U8 loads the step from GET /v1/paths/:id.
export default function StepPage() {
  const { id } = useParams();
  const module = demoModules.find((m) => String(m.number) === id);

  if (!module) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold text-text">Step not found</h1>
        <Link to="/today" className="font-semibold text-primary underline">
          Back to Today
        </Link>
      </main>
    );
  }

  const next = demoModules.find((m) => m.number === module.number + 1);
  return (
    <>
      <ModuleDetail module={module} backTo="/today" />
      <StickyActionBar
        label={next ? `Next: Module ${next.number}` : 'Back to Today'}
        to={next ? `/steps/${next.number}` : '/today'}
      />
    </>
  );
}
