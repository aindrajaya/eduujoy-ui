export const progressKeys = {
  all: ['progress'] as const,
  list: () => [...progressKeys.all, 'list'] as const,
  history: (topicId: string) => [...progressKeys.all, 'history', topicId] as const,
};
