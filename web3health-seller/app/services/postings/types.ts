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

// Assuming the response is an array of raw objects (common for simple functions)
export type PostingsResponseDTO = PostingDTO[];