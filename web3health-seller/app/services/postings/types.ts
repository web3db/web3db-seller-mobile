// src/services/postings/types.ts

/**
 * Defines the application model for a 'Posting' (Study).
 * The mapping logic is now handled inside the fetch-based API function.
 */
export type Study = {
  id: number;
  title: string;
  summary: string;
  description: string;
  statusId: number;
  // Placeholder fields maintained for the screen component display
  organizer: string; 
  spots: number;
};

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