// Friendly aliases over the generated contract types (src/api/schema.d.ts).
import type { components } from './schema';

type Schemas = components['schemas'];

export type Problem = Schemas['Problem'];
export type ProblemCode = Schemas['ProblemCode'];
export type FieldError = Schemas['FieldError'];

export type Me = Schemas['Me'];
export type Role = Schemas['Role'];
export type Plan = Schemas['Plan'];
export type Quota = Schemas['Quota'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type LoginRequest = Schemas['LoginRequest'];

export type Topic = Schemas['Topic'];
export type TopicResolveRequest = Schemas['TopicResolveRequest'];
export type TopicResolveResponse = Schemas['TopicResolveResponse'];

export type BloomLevel = Schemas['BloomLevel'];
export type DreyfusStage = Schemas['DreyfusStage'];
export type Position = Schemas['Position'];

export type DiagnosticStartRequest = Schemas['DiagnosticStartRequest'];
export type DiagnosticAnswer = Schemas['DiagnosticAnswer'];
export type DiagnosticAnswersRequest = Schemas['DiagnosticAnswersRequest'];
export type DiagnosticBatchResponse = Schemas['DiagnosticBatchResponse'];
export type DiagnosticResponse = Schemas['DiagnosticResponse'];
export type DiagnosticItem = Schemas['DiagnosticItem'];
export type Placement = Schemas['Placement'];

export type Path = Schemas['Path'];
export type PathSummary = Schemas['PathSummary'];
export type PathListResponse = Schemas['PathListResponse'];
export type PathCreateRequest = Schemas['PathCreateRequest'];
export type PathStep = Schemas['PathStep'];
export type StepPatchRequest = Schemas['StepPatchRequest'];
export type Resource = Schemas['Resource'];
export type ResourceType = Schemas['ResourceType'];
export type ResourceSwapRequest = Schemas['ResourceSwapRequest'];
export type FeedbackRequest = Schemas['FeedbackRequest'];

export type JobAccepted = Schemas['JobAccepted'];
export type JobProgressEvent = Schemas['JobProgressEvent'];
export type JobPartialEvent = Schemas['JobPartialEvent'];
export type JobCompletedEvent = Schemas['JobCompletedEvent'];
export type JobFailedEvent = Schemas['JobFailedEvent'];

export type Checkpoint = Schemas['Checkpoint'];
export type CheckpointSubmissionRequest = Schemas['CheckpointSubmissionRequest'];
export type CheckpointResult = Schemas['CheckpointResult'];

export type ProgressResponse = Schemas['ProgressResponse'];
export type ProgressHistoryResponse = Schemas['ProgressHistoryResponse'];
export type TopicPosition = Schemas['TopicPosition'];

export type CheckoutRequest = Schemas['CheckoutRequest'];
export type CheckoutResponse = Schemas['CheckoutResponse'];

export type ReviewItem = Schemas['ReviewItem'];
export type ReviewQueueResponse = Schemas['ReviewQueueResponse'];
export type ReviewResolveRequest = Schemas['ReviewResolveRequest'];
export type CostMetricsResponse = Schemas['CostMetricsResponse'];
export type LatencyMetricsResponse = Schemas['LatencyMetricsResponse'];

export type HealthResponse = Schemas['HealthResponse'];

export type WsPathReady = Schemas['WsPathReady'];
export type WsCheckpointGraded = Schemas['WsCheckpointGraded'];
export type WsStageAdvanced = Schemas['WsStageAdvanced'];
export type WsEntitlementChanged = Schemas['WsEntitlementChanged'];
export type WsReviewQueueCount = Schemas['WsReviewQueueCount'];
