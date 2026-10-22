import type { DiagnosticStartRequest } from '@/api/types';

type SelfReport = NonNullable<DiagnosticStartRequest['selfReport']>;

/**
 * The required self-report on /start: one honest choice that only sets where the diagnostic's
 * questions start (POST /v1/diagnostics selfReport). api-lane's start cells (0 = novice C1 …
 * 9 = expert C6): new 1, some 2, comfortable 4, experienced 6, expert 8; the diagnostic can climb
 * about 3 cells from there, so no option is a modest default.
 */
export const EXPERIENCE = [
  { value: 'new', label: 'I’m new to this', selfReport: { years: 0, projectsShipped: 0 } },
  { value: 'some', label: 'Some experience: under a year, or a project or two', selfReport: { years: 1, projectsShipped: 1 } },
  { value: 'comfortable', label: 'Comfortable: a few years or several projects', selfReport: { years: 3, projectsShipped: 3 } },
  { value: 'experienced', label: 'Experienced: 6+ years or 10+ projects', selfReport: { years: 6, projectsShipped: 10 } },
  { value: 'expert', label: 'Expert: 10+ years and 20+ projects', selfReport: { years: 10, projectsShipped: 20 } },
] as const satisfies readonly { value: string; label: string; selfReport: SelfReport }[];

export type Experience = (typeof EXPERIENCE)[number]['value'];
export const EXPERIENCE_VALUES = EXPERIENCE.map((e) => e.value) as [Experience, ...Experience[]];

export const selfReportFor = (experience: Experience): SelfReport =>
  EXPERIENCE.find((e) => e.value === experience)?.selfReport ?? EXPERIENCE[0].selfReport;
