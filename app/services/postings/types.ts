// src/services/postings/types.ts

/**
 * Defines the application model for a 'Posting' (Study).
 * The mapping logic is now handled inside the fetch-based API function.
 */
/**
 * Application models
 *
 * We keep summary and detail shapes separate to prevent type mismatches.
 */

export type StudySummary = {
  id: number;
  title: string;
  summary: string;
  description: string;
  statusId: number;

  // Used by the studies list UI (existing screens rely on these)
  organizer: string;
  spots: number;
};

/**
 * Detailed posting shape used by the study detail and manage screens.
 * This matches the fields accessed in:
 * - app/studies/[studyId]/index.tsx
 * - app/studies/[studyId]/manage.tsx
 */
export type StudyDetail = {
  postingId: number;
  buyerUserId: number;
  buyerDisplayName: string;

  postingStatusId: number;
  postingStatusDisplayName: string;

  title: string;
  summary: string;
  description: string | null;

  applyOpenAt: string | null;
  applyCloseAt: string | null;

  dataCoverageDaysRequired: number | null;
  minAge: number;

  rewardTypeId: number | null;
  rewardTypeDisplayName: string | null;
  rewardValue: number | null;

  /**
   * Some screens currently use metricId/metricDisplayName arrays,
   * while manage.tsx expects a metrics array of objects.
   * Keep both for now; we will unify after the screen edits.
   */
  metricId: number[] | null;
  metricDisplayName: string[] | null;

  metrics?: { metricId: number; displayName?: string; metricDisplayName?: string }[];

  viewPolicies: any[];
  healthConditions: { id: number; displayName: string }[];
  tags: string[];
  images: any[];

  isActive: boolean;
  isModified: boolean | null;
  createdOn: string | null;
  modifiedOn: string | null;
};

/**
 * Compatibility alias (temporary):
 * Existing code imports `Study` for the list screen.
 * We'll switch those imports to `StudySummary` next, then you may delete this alias.
 */
export type Study = StudySummary;

// --- DTOs (Data Transfer Objects) for the API response ---

// This matches the format the *Edge Function* or PostgREST might return.
export type PostingDTO = {
    PostingId: number;
    Title: string;
    Summary: string;
    Description: string;
    PostingStatusId: number;
    // ... other raw fields from TRN_Posting
};

export type Metric = {
  metricId: number;
  code: string;
  displayName: string;
  canonicalUnitCode: string;
  isActive: boolean;
};

export type PostingStatus = {
  postingStatusId: number;
  code: string;
  displayName: string;
  isActive: boolean;
};

export type RewardType = {
  rewardTypeId: number;
  code: string;
  displayName: string;
  isActive: boolean;
};

export type HealthCondition = {
  healthConditionId: number;
  code: string;
  displayName: string;
};

export type ShareMetric = {
  // metrics shape is flexible — include common known fields but keep indexable for unknown fields
  metricId?: number;
  metricName?: string;
  unitCode?: string;
  totalValue?: number;
  avgValue?: number;
  minValue?: number;
  maxValue?: number;
  samplesCount?: number;
  computedJson?: any;
  [key: string]: any;
};

export type ShareSegment = {
  segmentId?: number;
  dayIndex?: number;
  fromUtc?: string;
  toUtc?: string;
  metrics?: ShareMetric[];
  [key: string]: any;
};

export type Share = {
  userId?: number;
  userDisplayName?: string;
  sessionId?: number;
  statusId?: number;
  statusName?: string;
  segments?: ShareSegment[];
  [key: string]: any;
};

export type PostingSharesResponse = {
  postingId?: number;
  postingTitle?: string;
  shares?: Share[];
};

// Assuming the response is an array of raw objects (common for simple functions)
export type PostingsResponseDTO = PostingDTO[];