/** Query keys for the diagnostic (U6 builds its screens on these). */
export const diagnosticKeys = {
  all: ['diagnostic'] as const,
  batch: (diagnosticId: string) => [...diagnosticKeys.all, diagnosticId, 'batch'] as const,
};
