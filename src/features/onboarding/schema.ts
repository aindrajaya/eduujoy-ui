// zod/mini, loaded on demand by the intake form (lazyResolver). Bounds mirror the contract:
// TopicResolveRequest.text and DiagnosticStartRequest (goal, weeklyHours, formats, selfReport).
import { z } from 'zod/mini';

const optionalNumber = (min: number, max: number, message: string, integer = false) =>
  z.optional(
    (integer ? z.int() : z.number()).check(
      z.minimum(min, { error: message }),
      z.maximum(max, { error: message }),
    ),
  );

export const intakeSchema = z.object({
  topic: z.string().check(
    z.trim(),
    z.minLength(2, { error: 'Name a topic (at least 2 characters)' }),
    z.maxLength(120, { error: 'Keep the topic under 120 characters' }),
  ),
  goal: z.string().check(
    z.trim(),
    z.minLength(3, { error: 'Describe your goal (at least 3 characters)' }),
    z.maxLength(500, { error: 'Keep the goal under 500 characters' }),
  ),
  weeklyHours: z.number({ error: 'Enter hours per week' }).check(
    z.minimum(1, { error: 'Between 1 and 40 hours a week' }),
    z.maximum(40, { error: 'Between 1 and 40 hours a week' }),
  ),
  formats: z.array(z.enum(['video', 'text', 'papers'])).check(z.maxLength(3)),
  years: optionalNumber(0, 50, 'Between 0 and 50 years'),
  projectsShipped: optionalNumber(0, 1000, 'A whole number from 0 to 1000', true),
});

export type IntakeValues = z.infer<typeof intakeSchema>;
