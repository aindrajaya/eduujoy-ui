import { describe, expect, it } from 'vitest';
import { intakeSchema } from './schema';

const valid = { topic: 'UX research', goal: 'Lead research at my startup', weeklyHours: 4, formats: ['video' as const], experience: 'some' as const };

const errorsFor = (input: unknown) => {
  const result = intakeSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('intakeSchema', () => {
  it('accepts a valid intake and trims text', () => {
    const parsed = intakeSchema.parse({ ...valid, topic: '  UX research  ' });
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
    expect(errorsFor({ ...valid, formats: ['audio'] })).toHaveProperty('formats.0');
  });

  it('deduplicates formats', () => {
    expect(intakeSchema.parse({ ...valid, formats: ['video', 'text', 'video'] }).formats).toEqual(['video', 'text']);
  });

  it('allows no preferred format', () => {
    expect(intakeSchema.safeParse({ ...valid, formats: [] }).success).toBe(true);
  });

  it('requires one experience choice from the list', () => {
    expect(errorsFor({ ...valid, experience: undefined })).toEqual({ experience: 'Choose the option closest to you.' });
    expect(errorsFor({ ...valid, experience: null })).toEqual({ experience: 'Choose the option closest to you.' });
    expect(errorsFor({ ...valid, experience: 'guru' })).toHaveProperty('experience');
  });
});
