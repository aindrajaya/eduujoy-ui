import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/errors';
import type { Topic } from '@/api/types';
import { useSession } from '@/auth/session';
import IntakeForm from './components/IntakeForm';
import TopicChoices from './components/TopicChoices';
import WelcomeSplash from './components/WelcomeSplash';
import { intakeErrorMessage } from './errors';
import { useResolveTopic, useStartDiagnostic } from './queries';
import type { IntakeValues } from './schema';

type Step =
  | { name: 'splash' }
  | { name: 'form' }
  | { name: 'choices'; values: IntakeValues; choices: Topic[] };

/**
 * US-01 (FR-01, FR-02): intake → resolve the topic → disambiguate if needed → start the
 * diagnostic with the intake, then hand off to /diagnostic/:id (U6).
 */
export default function StartPage() {
  const navigate = useNavigate();
  const { data: me } = useSession();
  const resolve = useResolveTopic();
  const start = useStartDiagnostic();
  const [step, setStep] = useState<Step>({ name: 'splash' });
  const [values, setValues] = useState<IntakeValues | undefined>();
  const [error, setError] = useState<ApiError | null>(null);

  const showForm = useCallback(() => {
    setStep({ name: 'form' });
  }, []);

  const startDiagnostic = async (intake: IntakeValues, topic: Topic) => {
    const selfReport =
      intake.years === undefined && intake.projectsShipped === undefined
        ? undefined
        : { years: intake.years, projectsShipped: intake.projectsShipped };
    const batch = await start.mutateAsync({
      topicId: topic.id,
      goal: intake.goal,
      weeklyHours: intake.weeklyHours,
      ...(intake.formats.length > 0 ? { preferredFormats: intake.formats } : {}),
      ...(selfReport ? { selfReport } : {}),
    });
    await navigate(`/diagnostic/${encodeURIComponent(batch.diagnosticId)}`);
  };

  const handleIntake = async (intake: IntakeValues) => {
    setValues(intake);
    setError(null);
    try {
      const result = await resolve.mutateAsync({ text: intake.topic });
      if (result.status === 'choices' && result.choices?.length) {
        setStep({ name: 'choices', values: intake, choices: result.choices });
        return;
      }
      if (!result.topic) throw new ApiError({ status: 0, code: 'UNKNOWN', title: 'No topic returned' });
      await startDiagnostic(intake, result.topic);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error' }));
    }
  };

  const handleChoice = async (intake: IntakeValues, topic: Topic) => {
    setError(null);
    try {
      await startDiagnostic(intake, topic);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error' }));
    }
  };

  if (step.name === 'splash') return <WelcomeSplash onDone={showForm} />;

  if (step.name === 'choices') {
    return (
      <TopicChoices
        typed={step.values.topic}
        choices={step.choices}
        submitting={start.isPending}
        errorMessage={error ? intakeErrorMessage(error) : undefined}
        onConfirm={(topic) => void handleChoice(step.values, topic)}
        onEditTopic={() => {
          setError(null);
          setStep({ name: 'form' });
        }}
      />
    );
  }

  return (
    <IntakeForm
      defaultValues={{ ...values, ...(values ? {} : { weeklyHours: me?.user.weeklyHoursDefault ?? 3 }) }}
      onSubmit={(intake) => void handleIntake(intake)}
      submitting={resolve.isPending || start.isPending}
      error={error}
      errorMessage={error ? intakeErrorMessage(error) : undefined}
    />
  );
}
