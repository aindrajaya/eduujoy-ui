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
  PathSummary,
  Problem,
  ProblemCode,
  ProgressHistoryResponse,
  ProgressResponse,
  ReviewItem,
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

const STEP_OBJECTIVES = [
  'Map the questions your team needs answered',
  'Plan and run five user interviews',
  'Synthesise interview notes into themes',
  'Choose between a survey and a usability test',
  'Run a moderated usability test',
  'Turn findings into a prioritised recommendation'
];

function step(n: number, status: PathStep['status']): PathStep {
  return {
    id: `step-${n}`,
    n,
    status,
    remedial: false,
    bloom: n === 1 ? 'C2' : n < 5 ? 'C3' : 'C4',
    objective: STEP_OBJECTIVES[n - 1] ?? `Step ${n}`,
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
        keyTakeaways: [
          'Pick the method from the question, not habit',
          'Interviews explain why; analytics show what',
          'Five users surface most usability problems',
        ],
        concepts: [{ name: 'Choosing a method', start: '4:10', end: '7:45' }],
        quality: { relevance: 0.92, teaching: 0.88, recency: 0.7, accuracySignals: 0.9 },
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
      passScore: 80,
      attempts: 0,
      lastScore: null,
      rubric: ['Names a method that fits the question', 'Explains why it fits with one concrete reason'],
      items: [
        {
          id: `cp-${n}-1`,
          kind: 'single_choice',
          prompt: 'Which method answers "why" questions best?',
          options: [
            { id: 'a', label: 'Surveys' },
            { id: 'b', label: 'Interviews' },
            { id: 'c', label: 'Analytics' },
          ],
        },
        {
          id: `cp-${n}-2`,
          kind: 'multi_choice',
          prompt: 'Which of these are qualitative methods? Pick all that apply.',
          options: [
            { id: 'a', label: 'Usability tests' },
            { id: 'b', label: 'A/B tests' },
            { id: 'c', label: 'Contextual inquiry' },
          ],
        },
        {
          id: `cp-${n}-3`,
          kind: 'open',
          prompt: 'Your team wants to know why sign-ups dropped last month. Which method would you start with, and why?',
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
  stepsTotal: 6,
  totalHours: 4.5,
  steps: [
    step(1, 'completed'),
    step(2, 'active'),
    step(3, 'locked'),
    step(4, 'locked'),
    step(5, 'locked'),
    step(6, 'locked'),
  ],
};

/** The list item for mockPath (contract 0.3.0): no steps, but the current step for Today. */
export const mockPathSummary: PathSummary = (() => {
  const { steps, ...summary } = mockPath;
  const current = steps.find((s) => s.status !== 'completed' && s.status !== 'skipped');
  return {
    ...summary,
    currentStep: current
      ? { id: current.id, n: current.n, objective: current.objective, bloom: current.bloom, estMinutes: current.estMinutes, status: current.status }
      : null,
  };
})();

export const mockJobAccepted: JobAccepted = {
  jobId: 'job-1',
  status: 'queued',
  eventsUrl: '/v1/jobs/job-1/events',
};

/** A passing grade for step 2's checkpoint (scores are 0–100). */
export const mockCheckpointResult: CheckpointResult = {
  submissionId: 'sub-1',
  stepId: 'step-2',
  score: 87,
  passed: true,
  stageAdvanced: false,
  nextStepId: 'step-3',
  remedialStepId: null,
  items: [
    { itemId: 'cp-2-1', score: 100, feedback: 'Right: interviews reveal motivations.' },
    { itemId: 'cp-2-2', score: 100, feedback: 'Both observe people doing real tasks.' },
    {
      itemId: 'cp-2-3',
      score: 60,
      feedback: 'Interviews fit. Say what you would ask, e.g. what changed for them last month.',
      misconception: null,
    },
  ],
};

/** A failing grade; a second fail inserts a remedial step (US-05). */
export const mockCheckpointFailed: CheckpointResult = {
  ...mockCheckpointResult,
  submissionId: 'sub-2',
  score: 40,
  passed: false,
  nextStepId: null,
  items: [
    { itemId: 'cp-2-1', score: 0, feedback: 'Surveys show what people say, not why.', misconception: 'Surveys explain motivation' },
    { itemId: 'cp-2-2', score: 50, feedback: 'A/B tests are quantitative.' },
    { itemId: 'cp-2-3', score: 50, feedback: 'Name a method and give one reason it fits.' },
  ],
};

export const mockGradeJobAccepted: JobAccepted = {
  jobId: 'grade-1',
  status: 'queued',
  eventsUrl: '/v1/jobs/grade-1/events',
};

/** An open-answer grading job's event stream: progress, one item at a time, then the result inline. */
export const mockGradeJobEvents = [
  { id: '1', event: 'progress', data: { jobId: 'grade-1', stage: 'grade', done: 0, total: 1, message: 'Reading your answer' } },
  { id: '2', event: 'partial', data: { jobId: 'grade-1', kind: 'checkpoint_item', itemResult: mockCheckpointResult.items[2] } },
  {
    id: '3',
    event: 'completed',
    data: { jobId: 'grade-1', resultRef: '/v1/checkpoints/step-2/submissions/sub-1', result: mockCheckpointResult },
  },
] as const;

export const mockProgress: ProgressResponse = {
  items: [
    {
      topic: mockTopic,
      position: { stage: 'advanced_beginner', bloom: 'C3' },
      confidence: 0.78,
      source: 'checkpoint',
      activePathId: 'path-1',
      updatedAt: '2026-10-21T08:00:00Z',
    },
  ],
};

/** Oldest first: the diagnostic placed the learner, then checkpoints moved them up (US-09). */
export const mockProgressHistory: ProgressHistoryResponse = {
  topicId: 'topic-ux',
  items: [
    {
      position: { stage: 'advanced_beginner', bloom: 'C2' },
      confidence: 0.64,
      source: 'diagnostic',
      createdAt: '2026-10-14T08:00:00Z',
    },
    {
      position: { stage: 'advanced_beginner', bloom: 'C3' },
      confidence: 0.78,
      source: 'checkpoint',
      createdAt: '2026-10-21T08:00:00Z',
    },
  ],
};

/** Open items of each kind, newest first, plus one already resolved (FR-24). */
export const mockReviewItems: ReviewItem[] = [
  {
    id: 'review-1',
    kind: 'resource',
    targetId: 'res-2-yt',
    reason: 'Learner flagged: video is region-locked',
    detail: { title: 'User research methods explained', url: 'https://www.youtube.com/watch?v=Fj-2tVw0d1g' },
    status: 'open',
    resolution: null,
    createdAt: '2026-10-21T09:00:00Z',
  },
  {
    id: 'review-2',
    kind: 'diagnostic_item',
    targetId: 'q-17',
    reason: 'Low confidence: 41% of learners at C3 missed it',
    detail: { prompt: 'Which method answers "why" questions best?', bloom: 'C3' },
    status: 'open',
    resolution: null,
    createdAt: '2026-10-21T08:30:00Z',
  },
  {
    id: 'review-3',
    kind: 'learner_report',
    targetId: 'path-1',
    reason: 'Step 4 repeats step 2',
    status: 'open',
    resolution: null,
    createdAt: '2026-10-20T17:10:00Z',
  },
  {
    id: 'review-0',
    kind: 'path',
    targetId: 'path-0',
    reason: 'Validator: two steps share a resource',
    status: 'resolved',
    resolution: 'approved',
    createdAt: '2026-10-19T10:00:00Z',
  },
];

export const mockReviewQueue: ReviewQueueResponse = {
  openCount: mockReviewItems.filter((i) => i.status === 'open').length,
  nextCursor: null,
  items: mockReviewItems.filter((i) => i.status === 'open'),
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
  rows: [
    { stage: 'design', model: 'claude-sonnet-5-5', count: 40, p50Ms: 8_200, p95Ms: 19_500, errorRate: 0.025 },
    { stage: 'discover', model: 'gemini-embedding', count: 200, p50Ms: 310, p95Ms: 900, errorRate: 0 },
  ],
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

/** A path-generation job's event stream (contract x-sse-events). */
export const mockPathJobEvents = [
  { id: '1', event: 'progress', data: { jobId: 'job-1', stage: 'discover', done: 2, total: 6, message: 'Finding videos' } },
  { id: '2', event: 'progress', data: { jobId: 'job-1', stage: 'analyse', done: 4, total: 6, message: 'Analysing videos' } },
  { id: '3', event: 'partial', data: { jobId: 'job-1', kind: 'path_step', pathId: 'path-1', step: mockPath.steps[0] } },
  { id: '4', event: 'progress', data: { jobId: 'job-1', stage: 'validate', done: 6, total: 6 } },
  { id: '5', event: 'completed', data: { jobId: 'job-1', resultRef: '/v1/paths/path-1' } },
] as const;
