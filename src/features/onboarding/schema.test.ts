import { describe, expect, it } from 'vitest';
import { intakeSchema } from './schema';

const valid = { topic: 'UX research', goal: 'Lead research at my startup', weeklyHours: 4, formats: ['video' as const] };

const errorsFor = (input: unknown) => {
  const result = intakeSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('intakeSchema', () => {
  it('accepts a valid intake and trims text', () => {
    const parsed = intakeSchema.parse({ ...valid, topic: '  UX research  ', years: 2, projectsShipped: 3 });
    expect(parsed.topic).toBe('UX research');
  });

  it('mirrors the contract bounds', () => {
    expect(errorsFor({ ...valid, topic: 'x' })).toHaveProperty('topic');
    expect(errorsFor({ ...valid, topic: 'x'.repeat(121) })).toHaveProperty('topic');
    expect(errorsFor({ ...valid, goal: 'ab' })).toHaveProperty('goal');
    expect(errorsFor({ ...valid, goal: 'x'.repeat(501) })).toHaveProperty('goal');
    expect(errorsFor({ ...valid, weeklyHours: 0 })).toHaveProperty('weeklyHours');
    expect(errorsFor({ ...valid, weeklyHours: 41 })).toHaveProperty('weeklyHours');
    expect(errorsFor({ ...valid, weeklyHours: Number.NaN })).toHaveProperty('weeklyHours');
    expect(errorsFor({ ...valid, years: 51 })).toHaveProperty('years');
    expect(errorsFor({ ...valid, projectsShipped: 1.5 })).toHaveProperty('projectsShipped');
    expect(errorsFor({ ...valid, formats: ['audio'] })).toHaveProperty('formats.0');
  });

  it('allows no preferred format and no self-report', () => {
    expect(intakeSchema.safeParse({ ...valid, formats: [] }).success).toBe(true);
  });
});
