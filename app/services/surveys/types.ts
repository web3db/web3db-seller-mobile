// Survey feature TypeScript types
// Updated from reverted code: provider-agnostic naming + new message/email types

export type Survey = {
  survey_id: number;
  posting_id: number;
  created_by: number;
  title: string;
  form_responder_url?: string;
  participant_param_key?: string;
  is_active: boolean;
  created_on: string;
  modified_on: string;
  stats?: { recipients_total: number; opened_total: number };
};

export type SurveyListResponse = {
  ok: boolean;
  posting_id: number;
  page: number;
  page_size: number;
  total: number;
  surveys: Survey[];
};

export type SurveyCreateBody = {
  posting_id: number;
  title: string;
  parameterized_form_url: string;
};

export type SurveyCreateResponse = {
  ok: boolean;
  survey: Survey;
};

export type SurveyGetResponse = {
  ok: boolean;
  survey: Survey;
};

export type SurveyRecipient = {
  survey_recipient_id: number;
  participant_id: string;
  sent_on: string | null;
  opened_on: string | null;
  open_count: number;
  last_opened_on: string | null;
  status: 'SENT' | 'OPENED' | 'NOT_SENT';
};

export type RecipientsListResponse = {
  ok: boolean;
  survey_id: number;
  posting_id: number;
  page: number;
  page_size: number;
  total: number;
  recipients: SurveyRecipient[];
};

// --- Survey Send (send-to-all enrolled) ---

export type SurveySendBody = {
  include_message?: boolean;
  message_text?: string;
  force_resend?: boolean;
  dry_run?: boolean;
  limit?: number;
};

export type SurveySendResponse = {
  ok: boolean;
  survey_id: number;
  message_event_id?: number;
  pairs_sent: number;
  pairs_failed: number;
  pairs_skipped: number;
  message_recipients_created: number;
  errors: { code: string; message: string; details?: Record<string, unknown> }[];
};

// --- Dispatch ---

export type DispatchParticipant = {
  /** Internal use only -- used for dispatch API calls, not displayed in UI */
  user_id?: number;
  participant_id: string;
};

export type RecipientStatus = {
  survey_id: number;
  user_id?: number;
  participant_id?: string;
  sent_on: string | null;
  opened_on: string | null;
  open_count: number;
  last_opened_on: string | null;
  status: 'SENT' | 'OPENED' | 'NOT_SENT';
};

export type DispatchViewResponse = {
  ok: boolean;
  posting?: { posting_id: number };
  surveys: Survey[];
  participants: {
    page: number;
    page_size: number;
    total: number;
    items: DispatchParticipant[];
  };
  recipient_status: RecipientStatus[];
};

export type DispatchMode = 'SEND_MISSING' | 'RESEND_EXISTING' | 'SEND_AND_RESEND';

export type DispatchBody = {
  posting_id: number;
  survey_ids: number[];
  user_ids: number[];
  mode: DispatchMode;
  include_link?: boolean;
  include_message?: boolean;
  message_text?: string;
  dry_run?: boolean;
};

export type DispatchResults = {
  surveys_requested: number;
  users_requested: number;
  pairs_requested: number;
  users_enrolled: number;
  pairs_enrolled: number;
  pairs_skipped_not_enrolled: number;
  recipients_created: number;
  recipients_existing: number;
  emails_attempted: number;
  emails_succeeded: number;
  emails_failed: number;
  message_event_id?: number;
  message_recipients_created?: number;
};

export type DispatchResponse = {
  ok: boolean;
  posting_id: number;
  mode: DispatchMode;
  dry_run: boolean;
  results: DispatchResults;
  errors: { code: string; message: string; details?: Record<string, unknown> }[];
};

// --- Message History ---

export type MessageEvent = {
  survey_message_event_id: number;
  posting_id: number;
  survey_id: number | null;
  event_source: string;
  dispatch_mode: string | null;
  include_link: boolean;
  include_message: boolean;
  dry_run: boolean;
  initiated_by: number;
  pairs_sent: number;
  pairs_failed: number;
  pairs_skipped: number;
  created_on: string;
  survey_title?: string;
};

export type MessageEventListResponse = {
  ok: boolean;
  posting_id: number;
  page: number;
  page_size: number;
  total: number;
  events: MessageEvent[];
};

export type MessageRecipientItem = {
  survey_message_recipient_id: number;
  participant_id: string;
  outcome_status: string;
  skip_reason: string | null;
  failure_code: string | null;
  attempted_on: string | null;
  completed_on: string | null;
};

export type MessageHistoryDetail = {
  ok: boolean;
  event: MessageEvent;
  message_text?: string;
  recipients: {
    page: number;
    page_size: number;
    total: number;
    items: MessageRecipientItem[];
  };
};

// --- Email Preview ---

export type EmailPreviewRequest = {
  template_code?: string;
  survey_title?: string;
  study_title?: string;
  include_link?: boolean;
  include_message?: boolean;
  message_text?: string;
};

export type EmailPreviewResponse = {
  ok: boolean;
  rendered_subject: string;
  rendered_body: string;
  placeholders: Record<string, string>;
};

// --- Survey Inbox ---

export type SurveyInboxItem = {
  survey_recipient_id: number;
  survey_id: number;
  survey_title: string;
  survey_url: string; // Pre-built redirect URL (token is not exposed)
  sent_on: string | null;
  opened_on: string | null;
  status: string;
};

export type SurveyInboxResponse = {
  ok: boolean;
  user_id: number;
  page: number;
  page_size: number;
  total: number;
  items: SurveyInboxItem[];
};

export type ApiError = {
  ok: false;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
