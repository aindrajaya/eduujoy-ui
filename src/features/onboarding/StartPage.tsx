import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/errors';
import type { Topic } from '@/api/types';
import { useSession } from '@/auth/session';
import IntakeForm from './components/IntakeForm';
import NoQuestionBank from './components/NoQuestionBank';
import TopicChoices from './components/TopicChoices';
import WelcomeSplash from './components/WelcomeSplash';
import { intakeErrorMessage, type IntakeStep } from './errors';
import { selfReportFor } from './experience';
import { useResolveTopic, useStartDiagnostic } from './queries';
import type { IntakeValues } from './schema';

type Step =
  | { name: 'splash' }
  | { name: 'form' }
  | { name: 'choices'; values: IntakeValues; choices: Topic[] }
  // Contract 0.9.0: the topic has no diagnostic item bank yet; say so before starting.
  | { name: 'noBank'; values: IntakeValues; topic: Topic; related: Topic[] };

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
  // Which call failed: topic search (resolve) has its own outage copy (contract 0.4.0).
  const [failedStep, setFailedStep] = useState<IntakeStep>('start');

  const showForm = useCallback(() => {
    setStep({ name: 'form' });
  }, []);

  const startDiagnostic = async (intake: IntakeValues, topic: Topic) => {
    const batch = await start.mutateAsync({
      topicId: topic.id,
      goal: intake.goal,
      weeklyHours: intake.weeklyHours,
      ...(intake.formats.length > 0 ? { preferredFormats: intake.formats } : {}),
      selfReport: selfReportFor(intake.experience),
    });
    await navigate(`/diagnostic/${encodeURIComponent(batch.diagnosticId)}`);
  };

  /**
   * Starts the diagnostic, unless the topic has no questions yet (hasDiagnostic false): then the
   * learner first sees what happens instead, and the nearby topics we can test them on. An API
   * without the field (before 0.9.0) starts as before.
   */
  const proceed = async (intake: IntakeValues, topic: Topic, related: Topic[] = []) => {
    if (topic.hasDiagnostic === false) {
      setStep({ name: 'noBank', values: intake, topic, related });
      return;
    }
    await startDiagnostic(intake, topic);
  };

  const handleIntake = async (intake: IntakeValues) => {
    setValues(intake);
    setError(null);
    setFailedStep('resolve');
    try {
      const result = await resolve.mutateAsync({ text: intake.topic });
      setFailedStep('start');
      if (result.status === 'choices' && result.choices?.length) {
        setStep({ name: 'choices', values: intake, choices: result.choices });
        return;
      }
      if (!result.topic) throw new ApiError({ status: 0, code: 'UNKNOWN', title: 'No topic returned' });
      await proceed(intake, result.topic, result.related);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error' }));
    }
  };

  const handleChoice = async (intake: IntakeValues, topic: Topic) => {
    setError(null);
    setFailedStep('start');
    try {
      await proceed(intake, topic);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error' }));
    }
  };

  const handleCreateNew = async (intake: IntakeValues) => {
    setError(null);
    setFailedStep('create');
    try {
      const result = await resolve.mutateAsync({ text: intake.topic, createNew: true });
      setFailedStep('start');
      if (!result.topic) throw new ApiError({ status: 0, code: 'UNKNOWN', title: 'No topic returned' });
      await proceed(intake, result.topic, result.related);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error' }));
    }
  };

  /** From the no-bank step: a diagnostic on this topic (no questions) or on a nearby one. */
  const handleNoBankStart = async (intake: IntakeValues, topic: Topic) => {
    setError(null);
    setFailedStep('start');
    try {
      await startDiagnostic(intake, topic);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error' }));
    }
  };

  if (step.name === 'splash') return <WelcomeSplash onDone={showForm} />;

  if (step.name === 'noBank') {
    return (
      <NoQuestionBank
        topic={step.topic}
        related={step.related}
        submitting={start.isPending}
        errorMessage={error ? intakeErrorMessage(error, failedStep) : undefined}
        onStart={(topic) => void handleNoBankStart(step.values, topic)}
        onEditTopic={() => {
          setError(null);
          setStep({ name: 'form' });
        }}
      />
    );
  }

  if (step.name === 'choices') {
    return (
      <TopicChoices
        typed={step.values.topic}
        choices={step.choices}
        submitting={resolve.isPending || start.isPending}
        errorMessage={error ? intakeErrorMessage(error, failedStep) : undefined}
        onConfirm={(topic) => void handleChoice(step.values, topic)}
        onCreateNew={() => void handleCreateNew(step.values)}
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
      errorMessage={error ? intakeErrorMessage(error, failedStep) : undefined}
    />
  );
}
