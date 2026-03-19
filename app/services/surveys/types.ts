// Survey feature TypeScript types
// Matches the API spec in SurveyAPI.md

export type Survey = {
  survey_id: number;
  posting_id: number;
  created_by: number;
  title: string;
  google_form_responder_url?: string;
  prefill_entry_key?: string;
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
  google_prefilled_url: string;
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

export type DispatchParticipant = {
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
  dry_run?: boolean;
  include_link?: boolean;
  include_message?: boolean;
  message_text?: string;
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
};

export type DispatchResponse = {
  ok: boolean;
  posting_id: number;
  mode: DispatchMode;
  dry_run: boolean;
  results: DispatchResults;
  errors: { code: string; message: string; details: any }[];
};

export type MessageRecipientOutcome = {
  participant_id: string;
  survey_id?: number | null;
  outcome_status: string;
  skip_reason?: string | null;
  attempted_on?: string | null;
  completed_on?: string | null;
  failure_code?: string | null;
};

export type MessageEventDetail = {
  message_event_id: number;
  posting_id: number;
  created_on: string;
  created_by?: number | null;
  created_by_name?: string | null;
  event_source: string;
  dispatch_mode?: string | null;
  survey_id?: number | null;
  survey_title?: string | null;
  include_link?: boolean;
  include_message?: boolean;
  message_text?: string | null;
  summary: {
    targeted: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  recipients: MessageRecipientOutcome[];
};

export type MessageEventDetailResponse = {
  ok: boolean;
  event: MessageEventDetail;
};

export type MessageEvent = {
  message_event_id: number;
  created_on: string;
  created_by?: number;
  event_source: 'SURVEY_SEND' | 'DISPATCH_CENTER' | 'CUSTOM_MESSAGE' | string;
  dispatch_mode?: string | null;
  survey_id?: number | null;
  survey_title?: string | null;
  include_link?: boolean;
  include_message?: boolean;
  message_preview?: string | null;
  summary: {
    targeted: number;
    sent: number;
    failed: number;
    skipped: number;
  };
};

export type MessageHistoryResponse = {
  ok: boolean;
  posting_id: number;
  page: number;
  page_size: number;
  total: number;
  events: MessageEvent[];
};

export type SurveySendBody = {
  include_message?: boolean;
  message_text?: string;
  dry_run?: boolean;
  force_resend?: boolean;
  limit?: number;
};

export type SurveySendResults = {
  participants_found: number;
  recipients_created: number;
  recipients_existing: number;
  message_recipients_created: number;
  emails_attempted: number;
  emails_succeeded: number;
  emails_failed: number;
};

export type SurveySendResponse = {
  ok: boolean;
  survey_id: number;
  message_event_id?: number;
  results: SurveySendResults;
  errors: { code: string; message: string; details?: any }[];
};

export type ApiError = {
  ok: false;
  code: string;
  message: string;
  details: any;
};
