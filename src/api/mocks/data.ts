// Mock data typed against the contract, shared by MSW handlers, tests and the dev mock worker.
import type {
  CheckpointResult,
  CostMetricsResponse,
  DiagnosticBatchResponse,
  DiagnosticResponse,
  JobAccepted,
  LatencyMetricsResponse,
  Me,
  Path,
  PathStep,
  Problem,
  ProblemCode,
  ProgressHistoryResponse,
  ProgressResponse,
  ReviewQueueResponse,
  Topic,
  TopicResolveResponse,
} from '../types';

export const mockTopic: Topic = {
  id: 'topic-ux',
  canonicalName: 'Product Design (UI/UX)',
  description: 'Designing usable, useful digital products.',
  aliases: ['UX design', 'UI/UX'],
  parentId: null,
};

export const mockMe: Me = {
  user: {
    id: 'user-1',
    email: 'jane.doe@example.com',
    name: 'Jane Doe',
    locale: 'en',
    weeklyHoursDefault: 3,
  },
  roles: ['learner'],
  plan: 'free',
  quota: { credits: 0, monthlyPaths: 1, usedPaths: 0, periodEnd: '2026-11-21T00:00:00Z' },
};

export const mockResolveMatched: TopicResolveResponse = { status: 'matched', topic: mockTopic };

export const mockDiagnosticBatch: DiagnosticBatchResponse = {
  diagnosticId: 'diag-1',
  status: 'in_progress',
  progress: { answered: 0, estimatedTotal: 12 },
  items: [
    {
      id: 'q1',
      bloom: 'C2',
      kind: 'single_choice',
      prompt: 'Which method best uncovers why users abandon a checkout flow?',
      options: [
        { id: 'a', label: 'A/B test of button colours' },
        { id: 'b', label: 'Contextual interviews with recent abandoners' },
        { id: 'c', label: 'Heatmap of the landing page' },
      ],
    },
    {
      id: 'q2',
      bloom: 'C3',
      kind: 'short_answer',
      prompt: 'Name one heuristic you would check first on a cluttered settings screen.',
    },
  ],
};

export const mockDiagnosticCompleted: DiagnosticBatchResponse = {
  diagnosticId: 'diag-1',
  status: 'completed',
  progress: { answered: 12, estimatedTotal: 12 },
  placement: {
    id: 'placement-1',
    confidence: 0.78,
    position: { stage: 'advanced_beginner', bloom: 'C3' },
    reason: 'Solid on research basics; gaps in synthesis and strategy.',
  },
};

function step(n: number, status: PathStep['status']): PathStep {
  return {
    id: `step-${n}`,
    n,
    status,
    remedial: false,
    bloom: n === 1 ? 'C2' : 'C3',
    objective: `Step ${n}: practise one research method end to end`,
    doneWhen: 'You can explain when to use the method and have one artefact to show.',
    estMinutes: 45,
    difficulty: null,
    actions: [
      { n: 1, text: 'Watch the explainer', done: status === 'completed' },
      { n: 2, text: 'Write a one-page plan', done: false },
    ],
    resources: [
      {
        id: `res-${n}-yt`,
        type: 'youtube',
        title: 'User research methods explained',
        url: 'https://www.youtube.com/watch?v=Fj-2tVw0d1g',
        youtubeId: 'Fj-2tVw0d1g',
        source: 'Nielsen Norman Group',
        stage: 'advanced_beginner',
        bloomLevels: ['C2', 'C3'],
        durationMin: 10,
        whyThis: 'Short, visual overview that matches your preferred format.',
        keyTakeaways: ['Pick the method from the question, not habit'],
      },
      {
        id: `res-${n}-doc`,
        type: 'article',
        title: 'When to use which UX research method',
        url: 'https://www.nngroup.com/articles/which-ux-research-methods/',
        source: 'nngroup.com',
        stage: 'advanced_beginner',
        bloomLevels: ['C2'],
        readingMin: 12,
      },
    ],
    checkpoint: {
      passScore: 0.7,
      attempts: 0,
      lastScore: null,
      items: [
        {
          id: `cp-${n}-1`,
          kind: 'single_choice',
          prompt: 'Which method answers "why" questions best?',
          options: [
            { id: 'a', label: 'Surveys' },
            { id: 'b', label: 'Interviews' },
          ],
        },
      ],
    },
  };
}

export const mockPath: Path = {
  id: 'path-1',
  status: 'active',
  createdAt: '2026-10-21T08:00:00Z',
  topic: mockTopic,
  from: { stage: 'advanced_beginner', bloom: 'C3' },
  to: { stage: 'competent', bloom: 'C4' },
  stepsDone: 1,
  stepsTotal: 3,
  totalHours: 2.25,
  steps: [step(1, 'completed'), step(2, 'active'), step(3, 'locked')],
};

export const mockJobAccepted: JobAccepted = {
  jobId: 'job-1',
  status: 'queued',
  eventsUrl: '/v1/jobs/job-1/events',
};

export const mockCheckpointResult: CheckpointResult = {
  submissionId: 'sub-1',
  stepId: 'step-2',
  score: 1,
  passed: true,
  stageAdvanced: false,
  nextStepId: 'step-3',
  remedialStepId: null,
  items: [{ itemId: 'cp-2-1', score: 1, feedback: 'Right: interviews reveal motivations.' }],
};

export const mockProgress: ProgressResponse = {
  items: [
    {
      topic: mockTopic,
      position: { stage: 'advanced_beginner', bloom: 'C3' },
      confidence: 0.78,
      source: 'diagnostic',
      activePathId: 'path-1',
      updatedAt: '2026-10-21T08:00:00Z',
    },
  ],
};

export const mockProgressHistory: ProgressHistoryResponse = {
  topicId: 'topic-ux',
  items: [
    {
      position: { stage: 'advanced_beginner', bloom: 'C3' },
      confidence: 0.78,
      source: 'diagnostic',
      createdAt: '2026-10-21T08:00:00Z',
    },
  ],
};

export const mockReviewQueue: ReviewQueueResponse = {
  openCount: 1,
  nextCursor: null,
  items: [
    {
      id: 'review-1',
      kind: 'resource',
      targetId: 'res-2-yt',
      reason: 'Learner flagged: video is region-locked',
      status: 'open',
      resolution: null,
      createdAt: '2026-10-21T09:00:00Z',
    },
  ],
};

export const mockCostMetrics: CostMetricsResponse = {
  from: '2026-10-01',
  to: '2026-10-21',
  totalUsd: 4.12,
  rows: [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      stage: 'design',
      calls: 40,
      inputTokens: 520_000,
      outputTokens: 90_000,
      cacheReadTokens: 300_000,
      costUsd: 3.4,
    },
    {
      provider: 'google',
      model: 'gemini-embedding',
      stage: 'discover',
      calls: 200,
      inputTokens: 80_000,
      outputTokens: 0,
      costUsd: 0.72,
    },
  ],
};

export const mockLatencyMetrics: LatencyMetricsResponse = {
  from: '2026-10-01',
  to: '2026-10-21',
  rows: [{ stage: 'design', model: 'claude-sonnet-5-5', count: 40, p50Ms: 8_200, p95Ms: 19_500 }],
};

/** Builds a problem+json body the way the API's filter does. */
export function mockProblem(
  status: number,
  code: ProblemCode,
  title: string,
  extra: Partial<Problem> = {},
): Problem {
  return {
    type: `https://api.eduujoy.aindrajaya.my.id/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title,
    status,
    code,
    requestId: 'mock-request',
    ...extra,
  };
}

/** GET /v1/diagnostics/{id} for an in-progress diagnostic (contract 0.2.0). */
export const mockDiagnosticResume: DiagnosticResponse = {
  ...mockDiagnosticBatch,
  topic: mockTopic,
  createdAt: '2026-10-21T08:00:00Z',
  completedAt: null,
};
