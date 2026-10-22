// zod/mini, loaded on demand by the intake form (lazyResolver). Bounds mirror the contract:
// TopicResolveRequest.text and DiagnosticStartRequest (goal, weeklyHours, formats, selfReport).
import { z } from 'zod/mini';
import { EXPERIENCE_VALUES } from './experience';

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
  // Deduplicated (DiagnosticStartRequest.preferredFormats is uniqueItems, max 3).
  formats: z.pipe(
    z.array(z.enum(['video', 'text', 'papers'])),
    z.transform((formats) => [...new Set(formats)]),
  ),
  // Required single choice; it maps to DiagnosticStartRequest.selfReport (experience.ts).
  experience: z.enum(EXPERIENCE_VALUES, { error: 'Choose the option closest to you.' }),
});

export type IntakeValues = z.infer<typeof intakeSchema>;
