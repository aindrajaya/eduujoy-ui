export const jobKeys = {
  all: ['jobs'] as const,
  detail: (jobId: string) => [...jobKeys.all, jobId] as const,
};
