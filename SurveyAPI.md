Detailed Info on the API Implentation 
API 1: survey_create
1) Purpose
Create a new survey for a given posting (study) using a Google Forms prefilled link. The server extracts the responder URL + entry.<id> key, and stores the survey definition.
2) Method / Path
POST survey_create
3) Inputs
Request JSON (required)
posting_id (int)
title (string)
google_prefilled_url (string)
Example:
{
  "posting_id": 1,
  "title": "Week 1 Survey",
  "google_prefilled_url": "https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.123456789=TEST123"
}

Input validation rules
posting_id must be a positive integer.
title must be non-empty (recommend max length, e.g., 200 chars).
google_prefilled_url must be a valid URL.
google_prefilled_url must contain at least one query param key that matches:
entry.<digits> (e.g., entry.123456789)
If you allow multiple entry.* params in the URL, you must define the rule:
MVP rule: accept exactly one entry.<id> in the URL; reject if 0 or >1.
4) Outputs
Success Response JSON
{
  "ok": true,
  "survey": {
    "survey_id": 12,
    "posting_id": 1,
    "created_by": 42,
    "title": "Week 1 Survey",
    "google_form_responder_url": "https://docs.google.com/forms/d/e/FORM_ID/viewform",
    "prefill_entry_key": "entry.123456789",
    "is_active": true,
    "created_on": "2026-02-18T01:00:00Z",
    "modified_on": "2026-02-18T01:00:00Z"
  }
}

Error Response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | CONFLICT | SERVER_ERROR",
  "message": "…",
  "details": {}
}

5) Data Flow (DB + side effects)
Reads
TRN_Posting by PostingId
Needed to derive created_by:
created_by = TRN_Posting.BuyerUserId
Writes
TRN_Survey insert:
PostingId
CreatedBy
Title
GoogleFormResponderUrl
PrefillEntryKey
OriginalPrefilledUrl (optional — only if you sanitize; can omit for MVP)
Side effects
None (no email, no recipients created here)
6) Server Actions (step-by-step)
Validate request JSON
If missing posting_id/title/google_prefilled_url → BAD_REQUEST
Fetch posting
Query TRN_Posting where PostingId = posting_id
If not found → NOT_FOUND
Set created_by = BuyerUserId
Parse Google prefilled link
Create URL object from google_prefilled_url
Extract:
google_form_responder_url = origin + pathname
Example: https://docs.google.com/forms/d/e/FORM_ID/viewform
prefill_entry_key = the query key matching entry.<digits>
Example: entry.123456789
Enforce the “exactly one entry key” rule:
If none found → BAD_REQUEST
If more than one found → BAD_REQUEST (MVP)
Optional sanity:
Ensure hostname is docs.google.com
Ensure path contains /forms/ and ends with /viewform (or allow other variants if you’ve seen them)
Insert TRN_Survey row
Insert with PostingId, CreatedBy, Title, GoogleFormResponderUrl, PrefillEntryKey
If you enabled unique (PostingId, Title) and it conflicts → CONFLICT
Return created survey
Include created_by, timestamps
7) Constraints / Invariants (what must always be true)
CreatedBy must be derived from TRN_Posting.BuyerUserId (never taken from client).
Only canonical responder URL is stored (no per-user values stored in DB).
PrefillEntryKey stored must match the entry.<digits> format.
8) Scalability & limits
This endpoint is O(1) (single posting lookup + single insert).
Recommended limits:
title length max (e.g., 200)
google_prefilled_url length max (e.g., 2,000–4,000 chars)
9) Edge cases to document
Researcher pastes non-prefilled responder URL (no entry.*) → reject with actionable error:
“Please paste the Google Forms ‘Get pre-filled link’ URL.”
Researcher pastes prefilled URL containing multiple entry.* params → reject (MVP) with:
“Only one prefilled field is supported (Participant ID).”
Posting exists but BuyerUserId is null (shouldn’t happen) → SERVER_ERROR or BAD_REQUEST depending on your data rules.
10) Observability (log fields)
Log one structured line per call:
fn=survey_create
posting_id
created_by
survey_id (on success)
prefill_entry_key
elapsed_ms
ok=true/false and code on failure
11) Test checklist (minimum)
Valid prefilled URL with exactly one entry.* → creates survey.
Responder URL without entry.* → BAD_REQUEST.
Prefilled URL with 2 entry.* keys → BAD_REQUEST (MVP rule).
Invalid posting_id → NOT_FOUND.
Duplicate title within same posting (if unique enabled) → CONFLICT.
Host not docs.google.com → BAD_REQUEST (if you enforce domain).


API 2: survey_list_by_posting/{postingId}
1) Purpose
Return all surveys created under a specific posting (study), so the researcher can view/manage surveys for that posting.
Optionally returns simple stats per survey:
recipients_total
opened_total (opened == “submitted” in MVP)
2) Method / Path
GET survey_list_by_posting/{postingId}
Example:
GET survey_list_by_posting/1
3) Inputs
Path Params (required)
postingId (int)
Query Params (optional)
is_active=true|false
If omitted: return both active and inactive (or default to active only — pick one and document it).
include_stats=true|false
If true: include recipient counts per survey.
page=1
page_size=50
Recommended defaults
page=1
page_size=50
page_size max: 200
include_stats=false by default (keeps query cheap)
Input validation rules
postingId must be a positive integer.
page >= 1
1 <= page_size <= 200
is_active if present must be boolean parseable.
include_stats if present must be boolean parseable.
4) Outputs
Success Response JSON
{
  "ok": true,
  "posting_id": 1,
  "page": 1,
  "page_size": 50,
  "total": 2,
  "surveys": [
    {
      "survey_id": 12,
      "posting_id": 1,
      "created_by": 42,
      "title": "Week 1 Survey",
      "google_form_responder_url": "https://docs.google.com/forms/d/e/FORM_ID/viewform",
      "prefill_entry_key": "entry.123456789",
      "is_active": true,
      "created_on": "2026-02-18T01:00:00Z",
      "modified_on": "2026-02-18T01:00:00Z",
      "stats": {
        "recipients_total": 10,
        "opened_total": 6
      }
    }
  ]
}

Notes:
If include_stats=false, omit the stats object entirely (preferred), or set it to null — document your choice.
Including google_form_responder_url is optional from a product standpoint; if you don’t want to show it in list view, you can omit it here and return it only via survey_get. Just be consistent.
Error Response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
  "message": "…",
  "details": {}
}

5) Data Flow (DB + side effects)
Reads
TRN_Survey filtered by PostingId
Optional (if include_stats=true):
TRN_SurveyRecipient grouped by SurveyId:
recipients_total = count(*)
opened_total = count(*) where opened_on is not null
Writes
None
Side effects
None
6) Server Actions (step-by-step)
Validate path param
If postingId invalid → BAD_REQUEST
(Optional but recommended) Validate posting exists
Query TRN_Posting by postingId
If not found → NOT_FOUND
This makes errors clearer and prevents returning empty list for invalid posting.
Query surveys
Base query: TRN_Survey where PostingId = postingId
Apply filter if is_active provided:
IsActive = true/false
Order:
recommended: newest first → CreatedOn desc
Apply pagination:
offset = (page - 1) * page_size
limit = page_size
Also fetch total count for pagination
If include_stats=true
Query TRN_SurveyRecipient for the survey IDs in the current page:
group by SurveyId
compute totals:
recipients_total
opened_total (OpenedOn is not null)
Attach stats to each survey object (missing stats default to 0)
Return response payload
posting_id, page, page_size, total, surveys[]
7) Constraints / Invariants
Results must only include surveys whose PostingId == postingId.
If include_stats=true, stats must be computed using grouped aggregation, not per-survey loops.
No participant pseudonyms are computed here (not needed), and none are stored.
8) Scalability & limits
Must support pagination (page, page_size).
include_stats should aggregate only for surveys in the page, not for all surveys in the posting.
Recommended page_size max = 200.
Ensure indexes exist:
TRN_Survey(PostingId)
TRN_SurveyRecipient(SurveyId) (for stats aggregation)
9) Edge cases to document
Posting exists but has no surveys → return ok:true with empty surveys.
Posting does not exist → NOT_FOUND (if you implement the existence check).
If stats query returns no row for a survey → treat counts as zero.
10) Observability (log fields)
Log one structured line per request:
fn=survey_list_by_posting
posting_id
page, page_size
include_stats
returned_count
total
elapsed_ms
ok + code if failed
11) Test checklist (minimum)
Valid posting with 0 surveys → empty list.
Valid posting with multiple surveys → ordered by created_on desc.
Invalid postingId (non-int/negative) → BAD_REQUEST.
Non-existent postingId → NOT_FOUND (if existence check enabled).
Pagination works (page 1 vs page 2).
is_active=true filters correctly.
include_stats=true returns correct aggregated counts.


API 3: survey_get/{surveyId}
1) Purpose
Return full details of a specific survey (manage page header), optionally including aggregate recipient stats:
total recipients sent
total opened (MVP “submitted”)
This endpoint is used when the researcher opens the Survey Manage page.
2) Method / Path
GET survey_get/{surveyId}
Example:
GET survey_get/12
3) Inputs
Path Params (required)
surveyId (int)
Query Params (optional)
include_stats=true|false
Default: true (reasonable for manage page) or false (cheaper). Pick one and document it.
include_google_url=true|false
Default: true (if the UI shows the link), false if you want to hide it in some contexts.
Recommended defaults
include_stats=true
include_google_url=true
Input validation rules
surveyId must be a positive integer.
include_stats if present must be boolean parseable.
include_google_url if present must be boolean parseable.
4) Outputs
Success Response JSON
{
  "ok": true,
  "survey": {
    "survey_id": 12,
    "posting_id": 1,
    "created_by": 42,
    "title": "Week 1 Survey",
    "google_form_responder_url": "https://docs.google.com/forms/d/e/FORM_ID/viewform",
    "prefill_entry_key": "entry.123456789",
    "is_active": true,
    "created_on": "2026-02-18T01:00:00Z",
    "modified_on": "2026-02-18T01:20:00Z",
    "stats": {
      "recipients_total": 10,
      "opened_total": 6
    }
  }
}

If include_stats=false, omit stats (preferred) or return stats:null (document your choice).
If include_google_url=false, omit:
google_form_responder_url
prefill_entry_key
Error Response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
  "message": "…",
  "details": {}
}

5) Data Flow (DB + side effects)
Reads
TRN_Survey by SurveyId
Optional (if include_stats=true):
TRN_SurveyRecipient filtered by SurveyId aggregated:
recipients_total = count(*)
opened_total = count(*) where opened_on is not null
Writes
None
Side effects
None
6) Server Actions (step-by-step)
Validate path param
If surveyId invalid → BAD_REQUEST
Fetch survey
Query TRN_Survey where SurveyId = surveyId
If not found → NOT_FOUND
Optional stats
If include_stats=true:
Query TRN_SurveyRecipient where SurveyId = surveyId
recipients_total = count(*)
opened_total = count(*) where OpenedOn is not null
If no recipients exist yet, both are 0
Shape response
Always return:
survey_id, posting_id, created_by, title, is_active, created_on, modified_on
Return google_form_responder_url and prefill_entry_key only if include_google_url=true
Return
JSON with { ok: true, survey: ... }
7) Constraints / Invariants
Survey must be uniquely identified by surveyId.
Stats must match recipient table:
opened_total is derived from OpenedOn is not null
No participant pseudonyms are computed here (not needed).
8) Scalability & limits
O(1) survey lookup.
Stats query is O(n recipients for that survey) but performed as a single aggregate query.
Ensure indexes exist:
TRN_Survey(SurveyId) (PK)
TRN_SurveyRecipient(SurveyId) (index)
9) Edge cases to document
Survey exists but has not been sent:
recipients_total = 0
opened_total = 0
Survey is inactive:
still returned (manage page can show it), unless you prefer to hide inactive surveys (document your choice).
Survey has recipients but no opens:
opened_total = 0
10) Observability (log fields)
Log one structured line per request:
fn=survey_get
survey_id
include_stats
include_google_url
posting_id (if found)
elapsed_ms
ok + code if failed
11) Test checklist (minimum)
Valid surveyId returns survey details.
Invalid surveyId (non-int/negative) → BAD_REQUEST.
Non-existent surveyId → NOT_FOUND.
include_stats=true returns correct counts.
include_stats=false omits stats (or null per your spec).
include_google_url=false omits responder_url and entry key.
Survey with 0 recipients returns stats 0/0.


API 4: survey_send/{surveyId}
1) Purpose
Send a survey to all enrolled participants of the posting attached to the survey.

This endpoint:
- derives the participant list from TRN_ShareSession (enrollment source)
- creates/upserts TRN_SurveyRecipient rows (one per user)
- generates RecipientToken for new recipients only
- sets SentOn for newly-created recipients, and optionally updates SentOn for existing recipients when force_resend=true
- sends emails using MST_EmailTemplate (SURVEY_INVITE for first-time sends, SURVEY_REMINDER for resends)
- writes one TRN_EmailDeliveryLog row per email attempt (SENT or FAILED)
- returns a summary of what happened (counts + per-item errors)

Important MVP rule: calling survey_send multiple times must not create duplicate recipient rows.
This is enforced by the DB unique constraint (SurveyId, UserId).


2) Method / Path
POST survey_send/{surveyId}
Example:
POST survey_send/12

3) Inputs
Path Params (required)
surveyId (int)
Request JSON (optional)
dry_run (bool, default false)
if true: do not write DB and do not send emails; just compute counts
limit (int, optional)
for testing: send to first N enrolled users
force_resend (bool, default false)
if true: updates sent_on for existing recipients and re-sends email
only_status_id (int, optional)
if you want to restrict to certain session status (optional; only include if you really need it)
Example:
{
  "dry_run": false,
  "limit": 10,
  "force_resend": false
}

Input validation rules
surveyId must be positive integer.
If provided:
limit must be positive integer (recommend max, e.g., 2000 for safety in one invocation)
dry_run, force_resend must be boolean parseable

4) Execution Policy (Template, SentOn, Logging) — MUST FOLLOW
A) Template selection (authoritative)
- If a recipient row is newly created for (survey_id, user_id): use TemplateKey = SURVEY_INVITE
- If recipient row already exists and force_resend=true: use TemplateKey = SURVEY_REMINDER
- If recipient row already exists and force_resend=false: do not send an email for that user (skip)

B) SentOn semantics (authoritative)
- New recipient created: SentOn = now()
- Existing recipient with force_resend=true: SentOn = now() (overwrite last send time)
- Existing recipient with force_resend=false: SentOn is not modified

C) Email delivery logging (TRN_EmailDeliveryLog) — required
For every email attempt (including failures), insert exactly ONE row into TRN_EmailDeliveryLog with:
- PostingId, SurveyId, SurveyRecipientId, UserId
- TemplateKey used
- ToEmail used (or empty string if missing; see ErrorCode policy below)
- SendStatus: SENT or FAILED
- ErrorCode / ErrorMessage populated only for FAILED
Important: RecipientToken must never be stored in TRN_EmailDeliveryLog.

D) Email provider not configured (MVP policy)
If SMTP/provider configuration is missing:
- Still create/update TRN_SurveyRecipient rows per policy above (so the UI reflects intended sends)
- Attempted emails count increments
- All such attempts must be logged as FAILED with ErrorCode = EMAIL_NOT_CONFIGURED
- API returns ok=true with emails_failed > 0 (partial success)

5) Outputs
Success Response JSON
{
  "ok": true,
  "survey_id": 12,
  "posting_id": 1,
  "results": {
    "participants_found": 10,
    "recipients_created": 10,
    "recipients_existing": 0,
    "emails_attempted": 10,
    "emails_succeeded": 10,
    "emails_failed": 0
  },
  "errors": []
}

Partial success (still ok=true, but with errors)
{
  "ok": true,
  "survey_id": 12,
  "posting_id": 1,
  "results": {
    "participants_found": 10,
    "recipients_created": 10,
    "recipients_existing": 0,
    "emails_attempted": 10,
    "emails_succeeded": 8,
    "emails_failed": 2
  },
  "errors": [
    { "code": "EMAIL_FAILED", "message": "Failed to send to user_id=7", "details": {} }
  ]
}

Error Response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
  "message": "…",
  "details": {}
}


6) Data Flow (DB + side effects)
Reads
TRN_Survey by SurveyId
get: PostingId, IsActive, Title, etc.
TRN_ShareSession by PostingId
get distinct UserId enrolled
optionally filter by session status if you define that rule
(Email send) MST_User by UserId (to get participant emails)
required if you actually send emails from the backend

Writes

A) TRN_SurveyRecipient
- insert new rows where missing (idempotent via unique constraint (SurveyId, UserId))
- update existing rows only when force_resend=true
Fields written/updated:
- RecipientToken (new rows only)
- SentOn (new rows always; existing rows only when force_resend=true)
- (optional) ModifiedOn updated by trigger

B) TRN_EmailDeliveryLog
- insert exactly one row per email attempt (SENT or FAILED)
- never store RecipientToken in this table

Side effects
Send emails to participants containing exactly one actionable link:
https://<APP_BASE_URL>/survey_redirect/{recipient_token}


7) Server Actions (step-by-step)
Validate inputs
invalid surveyId → BAD_REQUEST
Fetch survey
query TRN_Survey by SurveyId
if missing → NOT_FOUND
if IsActive=false → BAD_REQUEST (or allow sending inactive; pick one and document)
read posting_id = survey.PostingId
Derive enrollment participant set
query TRN_ShareSession where PostingId = posting_id
select distinct UserId
apply optional filters (only if defined in product rules)
apply limit if provided
If dry_run=true
do not write DB
do not send emails
return:
participants_found
estimate recipients_created vs existing if you choose to compute it (optional)
end
Upsert recipients (idempotent)
For each user_id in participant set:
attempt insert into TRN_SurveyRecipient:
(SurveyId, PostingId, UserId, RecipientToken, SentOn)
If conflict on (SurveyId, UserId):
recipient exists:
if force_resend=true: update SentOn=now()
else: leave SentOn unchanged (or set if null; document)
Keep counters:
recipients_created
recipients_existing
Critical invariant: uniqueness is enforced by DB constraint (SurveyId, UserId).
Send emails (with templates + delivery logging)
1) Determine which recipients will be emailed in this invocation:
- all newly created recipients
- plus existing recipients only if force_resend=true
- existing recipients are skipped when force_resend=false

2) Batch load participant contact + personalization fields (single query, no N+1):
- MST_User fields needed (minimum):
  - UserId
  - Email
  - Full name (or FirstName/LastName) if available for {{participant_name}}

3) Batch load researcher display name (single query):
- Use survey.CreatedBy to load MST_User display name for {{researcher_name}}

4) Load email template from MST_EmailTemplate:
- For newly created recipients: TemplateKey = SURVEY_INVITE
- For resends: TemplateKey = SURVEY_REMINDER
If the required template is missing or inactive:
- For all affected emails: mark as FAILED
- Log FAILED in TRN_EmailDeliveryLog with ErrorCode = MISSING_EMAIL_TEMPLATE
- Continue processing other template type if applicable (e.g., invite exists but reminder missing)

5) Render placeholders (server-side only):
Supported placeholders:
{{participant_name}}, {{researcher_name}}, {{survey_title}}, {{study_title}}, {{study_id}}, {{survey_link}}
Rendering rules:
- If a runtime variable is missing, replace with empty string (except participant_name which should fall back to "Participant")
- survey_link MUST be constructed as:
  APP_BASE_URL + "/survey_redirect/" + recipient_token

6) For each email attempt:
- emails_attempted += 1
- If Email is missing/null:
  - emails_failed += 1
  - Insert TRN_EmailDeliveryLog row with:
    SendStatus=FAILED, ErrorCode=EMAIL_MISSING
  - Add error entry in response errors[]
  - Do not call provider
- Else if provider not configured:
  - emails_failed += 1
  - Insert TRN_EmailDeliveryLog row:
    SendStatus=FAILED, ErrorCode=EMAIL_NOT_CONFIGURED
  - Add error entry in response errors[]
- Else attempt provider send:
  - On success:
    - emails_succeeded += 1
    - Insert TRN_EmailDeliveryLog row:
      SendStatus=SENT
  - On failure:
    - emails_failed += 1
    - Insert TRN_EmailDeliveryLog row:
      SendStatus=FAILED, ErrorCode=EMAIL_PROVIDER_ERROR, ErrorMessage truncated
    - Add error entry in response errors[]

7) Do not retry within this endpoint (MVP).
Return ok=true with counts + errors[] when some emails fail.
Return ok=false only for invalid input or survey not found (early failure).

Return results summary
ok=true
include counts and errors (if any)

8) Constraints / Invariants (must always hold)
Enrollment source invariant
Participants must be derived from TRN_ShareSession by PostingId.
Enrollment list must be distinct user ids (avoid duplicates from multiple sessions).
Recipient uniqueness invariant
There must be at most one recipient row per (SurveyId, UserId).
DB constraint unique (SurveyId, UserId) guarantees this; server must treat conflicts as normal.
Token generation invariant
RecipientToken must be generated only for new recipient rows.
Existing rows must keep their original token unless you explicitly decide to rotate it (not needed for MVP).
“Sent” semantics invariant
SentOn != null means “survey was sent/queued by system.”
For MVP you can set SentOn=now() during creation (and during force_resend).

9) Scalability & limits (document clearly)
Required pagination/batching concept
Even if your first version loops, document limits so it can scale:
limit supported for testing
Internal batch size recommendation:
e.g., process in chunks of 200–500 userIds per DB operation / email send cycle
Avoid N+1
When sending emails:
fetch all emails in one query:
select UserId, Email from MST_User where UserId in (...)
Upper bound guardrails
Document:
limit max (example: 2000 per invocation)
Recommended for production postings larger than that:
multiple invocations (manual) or later background processing

10) Edge cases to document
Survey exists but no enrolled sessions:
participants_found = 0
no recipients created
no emails attempted
ok=true (this is not an error)
Duplicate sessions for same user:
must still create only one recipient row
 3. Existing recipients:
send again with force_resend=false:
do not update SentOn
 do not send email
 do not create TRN_EmailDeliveryLog rows (because no attempt occurred)
4. send again with force_resend=true:
  - update SentOn=now()
  - send reminder email (TemplateKey=SURVEY_REMINDER)
  - write TRN_EmailDeliveryLog rows for each attempted resend

5. Some users have null/empty email:
- count as emails_failed
- log TRN_EmailDeliveryLog with SendStatus=FAILED, ErrorCode=EMAIL_MISSING
- keep TRN_SurveyRecipient row unchanged (token remains valid)

6. Email provider missing/misconfigured:
- count as emails_failed
- log TRN_EmailDeliveryLog with SendStatus=FAILED, ErrorCode=EMAIL_NOT_CONFIGURED
- keep TRN_SurveyRecipient rows (so UI reflects intended send state)

7. Provider failure mid-batch:
- ok=true with errors[] per failed user
- every failure must have a TRN_EmailDeliveryLog row (FAILED)
- successes must have TRN_EmailDeliveryLog row (SENT)

Template Resolution Policy

The system must attempt to load required templates once per request:

- If SURVEY_INVITE is required for any pair and not found or inactive:
  All invite-type email attempts must be marked FAILED with:
  ErrorCode = MISSING_EMAIL_TEMPLATE

- If SURVEY_REMINDER is required for any pair and not found or inactive:
  All reminder-type email attempts must be marked FAILED with:
  ErrorCode = MISSING_EMAIL_TEMPLATE

Failure of one template type must not prevent processing of the other template type.


11) Observability (log fields)
Log one structured line per request:
fn=survey_send
survey_id
posting_id
dry_run
force_resend
participants_found
recipients_created
recipients_existing
emails_attempted
emails_succeeded
emails_failed
delivery_log_rows_written (should equal emails_attempted when provider/template/email present; can be 0 if dry_run)
elapsed_ms
ok and error code if failed early
Never log RecipientToken.
If you need per-email debugging, log only SurveyRecipientId and UserId (internal logs only).

11) Test checklist (minimum)
SurveyId invalid → BAD_REQUEST.
Survey not found → NOT_FOUND.
Survey inactive → BAD_REQUEST (if enforced).
Posting with 0 enrolled users → ok=true with zero counts.
Posting with 10 enrolled users → creates 10 recipients, sends 10 emails.
Call survey_send again → recipients_existing=10, created=0 (idempotent).
Call survey_send again with force_resend=true → existing=10, emails re-sent.
dry_run=true returns counts but creates nothing and sends nothing.
Mixed case: some emails missing or fail → ok=true, emails_failed > 0, errors[] populated.


API 5: survey_recipients_list/{surveyId}
1) Purpose
Return the list of recipients for a survey (one row per enrolled participant that the survey was sent to), including:
sent/opened timestamps
derived status (MVP “submitted” = opened)
computed participant_id (p_...) using your HMAC rule (not stored)
This endpoint powers the researcher’s “Recipients / Status” table in the admin portal.

2) Method / Path
GET survey_recipients_list/{surveyId}
Example:
GET survey_recipients_list/12?page=1&page_size=50
GET survey_recipients_list/12?status=opened&page=1&page_size=100

3) Inputs
Path Params (required)
surveyId (int)
Query Params (optional)
status=sent|opened
sent: sent_on is not null and opened_on is null
opened: opened_on is not null
page=1 (default 1)
page_size=50 (default 50, max 200)
order_by=sent_on|opened_on|created_on (optional)
order_dir=asc|desc (optional, default desc)
recommended default ordering:
opened_on desc nulls last, then sent_on desc
Input validation rules
surveyId must be positive integer.
page >= 1
1 <= page_size <= 200
If present:
status must be sent or opened
order_by must be one of allowed fields
order_dir must be asc or desc

4) Outputs
Success Response JSON
{
  "ok": true,
  "survey_id": 12,
  "posting_id": 1,
  "page": 1,
  "page_size": 50,
  "total": 10,
  "recipients": [
    {
      "survey_recipient_id": 88,
      "participant_id": "p_abcd123",
      "sent_on": "2026-02-18T02:00:00Z",
      "opened_on": "2026-02-18T05:10:00Z",
      "open_count": 1,
      "last_opened_on": "2026-02-18T05:10:00Z",
      "status": "OPENED"
    },
    {
      "survey_recipient_id": 89,
      "participant_id": "p_efgh456",
      "sent_on": "2026-02-18T02:00:00Z",
      "opened_on": null,
      "open_count": 0,
      "last_opened_on": null,
      "status": "SENT"
    }
  ]
}

Error Response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
  "message": "…",
  "details": {}
}


5) Data Flow (DB + side effects)
Reads
TRN_Survey by SurveyId
Needed to get PostingId for participant_id computation.
If survey not found → NOT_FOUND.
TRN_SurveyRecipient filtered by SurveyId
Apply status filter if provided.
Apply pagination + ordering.
Writes
None
Side effects
None

6) Server Actions (step-by-step)
Validate inputs
invalid surveyId/page/page_size/status/order params → BAD_REQUEST
Fetch survey
query TRN_Survey where SurveyId = surveyId
if not found → NOT_FOUND
read posting_id = survey.PostingId
Build recipient query
base: TRN_SurveyRecipient where SurveyId = surveyId and IsActive = true (if you want to hide inactive recipients)
apply optional status filter:
status=opened → OpenedOn is not null
status=sent → SentOn is not null and OpenedOn is null
compute total count for pagination
Apply ordering
recommended default:
OpenedOn desc nulls last
SentOn desc
If order_by specified, enforce allowlist.
Apply pagination
offset = (page - 1) * page_size
limit = page_size
Compute participant_id per row
For each recipient row with (user_id):
compute:
participant_id = HMAC(PSEUDONYM_HMAC_KEY, "posting:<posting_id>:user:<user_id>")
take first 16 bytes, base64url, prefix p_ (matching your existing function)
do not store the result
Derive status
if OpenedOn != null → status = "OPENED"
else if SentOn != null → status = "SENT"
else → optional "NOT_SENT" (normally shouldn’t occur if you set SentOn at send time)
Return response
include posting_id (helps UI + debugging)
include total for pagination UI

7) Constraints / Invariants (must always hold)
Participant ID invariants
Must be computed deterministically using:
same secret key as your existing pseudonym function (PSEUDONYM_HMAC_KEY)
same message format:
"posting:<posting_id>:user:<user_id>"
same truncation/encoding:
16 bytes → base64url → p_<...>
Participant ID must never be persisted in DB.
Recipient visibility invariants
Only recipients for the given surveyId may be returned.
If IsActive=false recipients exist, decide whether to hide them (recommended for MVP) and document it.
Ordering invariants
Default ordering must be deterministic (avoid unstable ordering):
if using opened_on/sent_on, add a stable tie-breaker like SurveyRecipientId desc in DB query.

8) Scalability & limits
Pagination is mandatory
page_size default 50, max 200.
Total count must be returned for UI paging.
Computation cost
HMAC computation is per row, so cap page_size to keep edge function runtime predictable.
Index usage
Ensure these exist (you already planned them):
TRN_SurveyRecipient(SurveyId) index
TRN_SurveyRecipient(SurveyId, OpenedOn) optional if opened filter becomes common
TRN_SurveyRecipient(SurveyId, SentOn) optional if sent filter becomes common

9) Edge cases to document
Survey exists but no recipients yet:
total=0, recipients=[], ok=true
Status filter results in empty list:
ok=true with empty recipients
Recipient rows exist with SentOn null (shouldn’t happen if send sets it):
status becomes NOT_SENT (or treat as SENT only when SentOn exists)
HMAC key missing in environment:
return SERVER_ERROR with message “Missing PSEUDONYM_HMAC_KEY”
(This matches your existing pattern)
Large surveys:
require pagination; do not allow page_size > 200

10) Observability (log fields)
Log one structured line per request:
fn=survey_recipients_list
survey_id
posting_id
status_filter
page, page_size
returned_count
total
elapsed_ms
ok + code if failed

11) Test checklist (minimum)
Invalid surveyId → BAD_REQUEST.
Survey not found → NOT_FOUND.
Survey with 0 recipients → ok=true, total=0.
Survey with recipients → returns participant_id computed, no user_id exposed.
status=opened returns only rows with opened_on not null.
status=sent returns only rows with sent_on not null and opened_on null.
Pagination works: page 1 vs page 2.
Ordering stable: repeated calls return same ordering.
Missing HMAC env key → SERVER_ERROR.

API 6: survey_inbox?user_id=…
1) Purpose
Return the list of surveys received by a participant (used by the mobile app “Surveys” tab / inbox).
This endpoint reads TRN_SurveyRecipient for a user and returns:
survey title + posting id
sent/opened timestamps
derived status
the recipient_token needed to open the survey (API #7)
Note (current MVP): since you are not using JWT, user_id is passed as a query param. Document this clearly as a temporary constraint.

2) Method / Path
GET survey_inbox
Examples:
GET survey_inbox?user_id=7
GET survey_inbox?user_id=7&status=sent&page=1&page_size=50

3) Inputs
Query Params (required for MVP)
user_id (int, required)
Query Params (optional)
status=sent|opened
sent: sent_on is not null and opened_on is null
opened: opened_on is not null
page=1 (default 1)
page_size=50 (default 50, max 200)
order_by=sent_on|opened_on|created_on (optional)
order_dir=asc|desc (optional, default desc)
Recommended default ordering
newest first: sent_on desc nulls last, tie-break survey_recipient_id desc
Input validation rules
user_id must be a positive integer.
page >= 1
1 <= page_size <= 200
If present:
status must be sent or opened
order_by must be allowlisted
order_dir must be asc or desc

4) Outputs
Success Response JSON
{
  "ok": true,
  "user_id": 7,
  "page": 1,
  "page_size": 50,
  "total": 3,
  "items": [
    {
      "survey_id": 12,
      "posting_id": 1,
      "survey_title": "Week 1 Survey",
      "sent_on": "2026-02-18T02:00:00Z",
      "opened_on": null,
      "status": "SENT",
      "recipient_token": "abcxyz123"
    },
    {
      "survey_id": 13,
      "posting_id": 1,
      "survey_title": "Week 2 Survey",
      "sent_on": "2026-02-25T02:00:00Z",
      "opened_on": "2026-02-25T04:12:00Z",
      "status": "OPENED",
      "recipient_token": "qwerty999"
    }
  ]
}

Error Response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | SERVER_ERROR",
  "message": "…",
  "details": {}
}

Note: You typically do not return NOT_FOUND for missing users in inbox; returning an empty list is often fine. If you prefer strict validation, you can check MST_User existence and return NOT_FOUND. Pick one and document it.

5) Data Flow (DB + side effects)
Reads
TRN_SurveyRecipient filtered by UserId
Join TRN_Survey (by SurveyId) to include:
Title
PostingId
Writes
None
Side effects
None

6) Server Actions (step-by-step)
Validate inputs
missing/invalid user_id → BAD_REQUEST
invalid paging params → BAD_REQUEST
Build base query
from TRN_SurveyRecipient r
where r.UserId = user_id
and (optional) r.IsActive = true (recommended)
Apply status filter (optional)
status=opened:
r.OpenedOn is not null
status=sent:
r.SentOn is not null and r.OpenedOn is null
Join survey
join TRN_Survey s on s.SurveyId = r.SurveyId
optionally filter out inactive surveys:
s.IsActive = true (recommended so users don’t see revoked surveys)
Compute total
count matching rows (for pagination)
Apply ordering
default: r.SentOn desc nulls last, tie-break r.SurveyRecipientId desc
enforce allowlist if custom ordering is allowed
Apply pagination
offset = (page - 1) * page_size
limit = page_size
Shape response items
For each row:
survey_id = r.SurveyId
posting_id = r.PostingId (denormalized) or s.PostingId
survey_title = s.Title
sent_on = r.SentOn
opened_on = r.OpenedOn
recipient_token = r.RecipientToken
status derived:
if opened_on != null → OPENED
else if sent_on != null → SENT
else optional NOT_SENT
Return
{ ok: true, user_id, page, page_size, total, items }

7) Constraints / Invariants (must always hold)
Token usage invariant
The inbox must return the recipient_token so the client can open API #7:
GET survey_redirect/{recipientToken}
Status semantics invariant
UI “Submitted” maps to OPENED (opened_on not null).
Do not represent “submitted” as actual Google submission.
Privacy invariant
Do not return internal UserId of other users (only the requesting user_id).
Do not return participant pseudonym here (not required for inbox).
MVP auth invariant (temporary)
user_id is trusted input for MVP (no JWT).
Document explicitly:
“Future: derive user_id from JWT; remove query param.”

8) Scalability & limits
Pagination required: page_size max 200.
Use indexes:
TRN_SurveyRecipient(UserId)
optionally TRN_SurveyRecipient(UserId, OpenedOn) if status filters become frequent
This endpoint is efficient: one indexed filter + join.

9) Edge cases to document
User has no surveys:
ok=true, total=0, items=[]
Survey is deactivated:
recommended: hide it by filtering TRN_Survey.IsActive=true
Recipient row exists but SentOn is null:
uncommon, but status becomes NOT_SENT (or you can hide these rows)
Multiple postings:
inbox may return surveys from different postings; UI should group if needed (not API responsibility)

10) Observability (log fields)
Log one structured line per request:
fn=survey_inbox
user_id
status_filter
page, page_size
returned_count
total
elapsed_ms
ok + code if failed

11) Test checklist (minimum)
Missing user_id → BAD_REQUEST.
Invalid user_id (negative/non-int) → BAD_REQUEST.
User with 0 inbox items → empty list.
User with items returns joined title/posting_id + token.
status=opened filters correctly.
status=sent filters correctly.
Pagination works.
Inactive surveys are hidden (if you enforce that rule).

API 7: survey_redirect/{recipientToken}
1) Purpose
This is the single-click survey link endpoint.
When a participant opens the survey link (from email or from the app), this endpoint:
finds the matching recipient row using recipient_token
records that the link was opened (opened_on, open_count, last_opened_on)
computes the deterministic participant_id (p_...) using your HMAC rule
redirects (HTTP 302) to the Google Form responder URL with the participant id prefilled
MVP status meaning: “Submitted” in UI == link opened (this endpoint was hit successfully).

2) Method / Path
GET survey_redirect/{recipientToken}
Example:
GET survey_redirect/abcxyz123

3) Inputs
Path Params (required)
recipientToken (text)
Input validation rules
recipientToken must be non-empty.
Recommended: enforce a safe character set and length:
length min 16, max 256
allow [A-Za-z0-9_-] if you generate URL-safe tokens
If invalid format → BAD_REQUEST
(Format enforcement is optional but helps reduce noisy traffic.)

4) Outputs
Success response
HTTP 302 Redirect
Location: <google_form_redirect_url_with_prefill>
No JSON body required.
Error response JSON (standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
  "message": "…",
  "details": {}
}

NOT_FOUND cases
token does not exist
recipient row exists but IsActive=false
survey exists but IsActive=false (if you enforce that)

5) Data Flow (DB + side effects)
Reads
TRN_SurveyRecipient by RecipientToken
fetch:
SurveyId
PostingId
UserId
OpenedOn
IsActive
TRN_Survey by SurveyId
fetch:
GoogleFormResponderUrl
PrefillEntryKey
IsActive
Writes
TRN_SurveyRecipient update:
If OpenedOn is null:
set OpenedOn = now()
Always:
set LastOpenedOn = now()
increment OpenCount = OpenCount + 1
update ModifiedOn via trigger
Side effects
HTTP redirect to Google Forms

6) Server Actions (step-by-step)
Validate token
if empty/invalid format → BAD_REQUEST
Lookup recipient row by token
query TRN_SurveyRecipient where RecipientToken = token
if not found → NOT_FOUND
if IsActive=false → NOT_FOUND (or BAD_REQUEST; choose and document)
read survey_id, posting_id, user_id
Fetch survey
query TRN_Survey where SurveyId = recipient.SurveyId
if not found → NOT_FOUND
if survey IsActive=false → NOT_FOUND (recommended: prevents opening revoked surveys)
read:
google_form_responder_url
prefill_entry_key
Update opened tracking (idempotent-safe)
If OpenedOn is null, set OpenedOn = now()
Set LastOpenedOn = now()
Increment OpenCount
(Optional) store request metadata later (IP/User-Agent) — you said not needed for MVP
Concurrency note (documented):
If multiple clicks happen at once, it’s okay if OpenCount increments multiple times.
OpenedOn should remain the timestamp of first open. Implement as:
update where OpenedOn is null for first-open set (or use coalesce(OpenedOn, now())).
Compute participant_id (HMAC)
Use the same rule you already use:
message: "posting:<posting_id>:user:<user_id>"
HMAC-SHA256 with PSEUDONYM_HMAC_KEY
truncate to 16 bytes
base64url encode
prefix with p_
If PSEUDONYM_HMAC_KEY missing → SERVER_ERROR
Build redirect URL
base: google_form_responder_url
add query param:
key: prefill_entry_key (e.g., entry.123456789)
value: encodeURIComponent(participant_id)
Must handle whether base URL already has query params:
if none: ?entry...=p_...
else: &entry...=p_...
Return HTTP 302 redirect
Location: <final_url>

7) Constraints / Invariants (must always hold)
Privacy invariant
Do not include user_id or any internal IDs in response.
The only outward identifier used is the computed participant_id embedded in Google query param.
Determinism invariant
participant_id must match what researchers see in admin portal (API #5).
It must be computed using the same secret and message format.
Tracking invariant
“Opened” tracking must be updated before redirecting.
OpenedOn is first-open timestamp; LastOpenedOn is latest-open timestamp.
Safety invariant
If token is invalid or survey revoked, do not redirect to Google.

8) Scalability & limits
This endpoint must be O(1):
lookup by RecipientToken (unique index)
lookup by SurveyId (PK)
one update statement
It should remain fast under high click volume.
Indexes required:
TRN_SurveyRecipient(RecipientToken) unique
TRN_Survey(SurveyId) PK

9) Edge cases to document
Token not found → NOT_FOUND JSON.
Recipient inactive → NOT_FOUND JSON.
Survey inactive/revoked → NOT_FOUND JSON.
Missing HMAC secret → SERVER_ERROR JSON.
Multiple clicks:
first click sets OpenedOn
later clicks keep OpenedOn unchanged, update LastOpenedOn, increment OpenCount
Google URL already has query params:
must append with & not ?

10) Observability (log fields)
Log one structured line per request:
fn=survey_redirect
token_prefix (first 6 chars only; never log full token)
survey_id
posting_id
opened_first_time=true/false
open_count_after
elapsed_ms
ok + code if failed
(Logging only a prefix avoids leaking a usable token into logs.)

11) Test checklist (minimum)
Invalid token format → BAD_REQUEST.
Token not found → NOT_FOUND.
Valid token:
opened_on gets set
open_count increments
returns 302
Repeat click:
opened_on unchanged
last_opened_on updated
open_count increments again
Survey inactive:
returns NOT_FOUND, no redirect
Missing HMAC secret:
returns SERVER_ERROR
URL building:
base URL without query uses ?
base URL with query uses &


NOTE IMP
Deterministic De-identified Participant ID (HMAC pseudonym)
We already generate participant IDs using HMAC-SHA256 and base64url encoding (RFC 4648 URL-safe), with truncation to 16 bytes for readability.
Must match existing implementation used in buyer_get_posting_shares:
Message format (exact):


posting:<posting_id>:user:<user_id>


Algorithm:


HMAC-SHA256 using crypto.subtle (Deno runtime)


Output:


take first 16 bytes of MAC


base64url encode (replace +→-, /→_, strip =)


prefix with p_


Required environment variable
PSEUDONYM_HMAC_KEY


secret string used as HMAC key


must be present in every environment (dev/stage/prod)


must remain stable per environment to keep participant IDs consistent over time


Failure behavior
If PSEUDONYM_HMAC_KEY is missing:


return SERVER_ERROR with a clear message (existing pattern already does this)



B) Supabase access (Edge Functions)
Survey Edge Functions use the Supabase service role key to read/write protected tables.
Required environment variables
SUPABASE_URL


SUPABASE_SERVICE_ROLE_KEY


Client initialization pattern
Use createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })


This matches the existing function you provided.


Failure behavior
If either env var is missing:


return SERVER_ERROR (“Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY”)



C) Recipient token generation (for survey links)
TRN_SurveyRecipient.RecipientToken must be an opaque, unguessable token used for:
GET survey_redirect/{recipientToken}


Constraints
Must be unique (DB unique constraint enforces this)


Must be URL-safe


Must be high entropy (do not derive token from user_id/posting_id)


Note
Even though participant_id is deterministic, the recipient token must not be deterministic; it’s intended to prevent trivial guessing of survey links.



D) Email delivery prerequisites (required for survey_send)
survey_send/{surveyId} sends survey links by email. For production readiness, a mail transport must be configured.
What must be set up
An SMTP provider (or equivalent email service) must be configured for the Edge Function runtime.


The implementation should read credentials from environment variables (never hardcode).


Recommended environment variables (generic SMTP)
SMTP_HOST


SMTP_PORT


SMTP_USER


SMTP_PASS


SMTP_FROM_EMAIL


SMTP_FROM_NAME (optional)


Runtime behavior requirements
If SMTP is not configured, survey_send must:


still create recipient rows in TRN_SurveyRecipient (so UI can show “sent” workflow if you choose)


return ok=true with emails_failed > 0 and an error entry indicating “EMAIL_NOT_CONFIGURED”


or if you prefer strict behavior: return SERVER_ERROR and do not attempt sending
 (pick one and document it; MVP usually prefers partial success)


Email content requirements
The email must contain exactly one actionable link:


https://<app-domain>/survey_redirect/{recipient_token}


Do not include user_id or participant_id in email body.



E) CORS + open endpoint behavior (MVP pattern)
Your existing Edge Function already supports:
OPTIONS for CORS


open endpoint (no JWT)


Survey endpoints should follow the same CORS headers pattern for consistency:
Access-Control-Allow-Origin


Access-Control-Allow-Methods


Access-Control-Allow-Headers



Where this applies in Survey APIs
API #5 survey_recipients_list


uses the HMAC pseudonym logic to compute participant_id


API #7 survey_redirect


uses the HMAC pseudonym logic to prefill Google Form


API #4 survey_send


depends on email transport setup (SMTP/provider) to deliver links


API 8: survey_dispatch

1) Purpose
Send or re-send one or more surveys to one or more enrolled users for a given posting (study).
This endpoint supports:
One survey → one user
One survey → many users
Many surveys → one user (catch-up)
Many surveys → many users (batch catch-up)
This endpoint:
Enforces enrollment (users must be enrolled in the posting via TRN_ShareSession)
Uses TRN_SurveyRecipient for idempotent recipient creation
Uses MST_EmailTemplate for email content
Writes TRN_EmailDeliveryLog for every email attempt
Applies deterministic template + resend rules
Returns detailed summary counts and per-item errors
Recipient uniqueness is enforced by the DB constraint (SurveyId, UserId).

2) Method / Path
POST survey_dispatch

3) Inputs
Request JSON (required)
{
  "posting_id": 1,
  "survey_ids": [12, 13, 14],
  "user_ids": [3, 4],
  "mode": "SEND_MISSING",
  "dry_run": false
}

Fields
posting_id (int, required)
survey_ids (int[], required, non-empty)
user_ids (int[], required, non-empty)
mode (string, required)
SEND_MISSING
RESEND_EXISTING
SEND_AND_RESEND
dry_run (bool, optional, default false)
Validation Rules
posting_id must be positive integer
survey_ids must be non-empty positive integers
user_ids must be non-empty positive integers
mode must be allowlisted
survey_ids.length ≤ 50
user_ids.length ≤ 2000
survey_ids.length × user_ids.length ≤ 10,000
If pair cap exceeded → BAD_REQUEST

4) Execution Policy (Authoritative)
A) Template Selection
Scenario
TemplateKey
New recipient row created
SURVEY_INVITE
Existing recipient + resend
SURVEY_REMINDER
Existing recipient + SEND_MISSING
Skip


B) SentOn Semantics
New insert → SentOn = now()
Resend (existing + mode allows) → SentOn = now() (overwrite)
Skip → SentOn unchanged
SentOn represents last send time, not first send time.

C) Email Delivery Logging (MANDATORY)
For every email attempt, insert exactly ONE row into TRN_EmailDeliveryLog:
Fields required:
PostingId
SurveyId
SurveyRecipientId
UserId
TemplateKey
ToEmail
SendStatus = SENT or FAILED
ErrorCode (if failed)
ErrorMessage (truncated if present)
Never store RecipientToken in TRN_EmailDeliveryLog.

D) Provider Not Configured (MVP Behavior)
If SMTP/provider config missing:
Still create/update TRN_SurveyRecipient rows
Attempted emails count increments
All attempts logged as FAILED with:
ErrorCode = EMAIL_NOT_CONFIGURED
API returns ok=true with emails_failed > 0
Template Resolution Policy

The system must attempt to load required templates once per request:

- If SURVEY_INVITE is required for any pair and not found or inactive:
  All invite-type email attempts must be marked FAILED with:
  ErrorCode = MISSING_EMAIL_TEMPLATE

- If SURVEY_REMINDER is required for any pair and not found or inactive:
  All reminder-type email attempts must be marked FAILED with:
  ErrorCode = MISSING_EMAIL_TEMPLATE
Failure of one template type must not prevent processing of the other template type.

5) Outputs
Success
{
  "ok": true,
  "posting_id": 1,
  "mode": "SEND_MISSING",
  "dry_run": false,
  "results": {
    "surveys_requested": 3,
    "users_requested": 2,
    "pairs_requested": 6,
    "users_enrolled": 2,
    "pairs_enrolled": 6,
    "pairs_skipped_not_enrolled": 0,
    "recipients_created": 4,
    "recipients_existing": 2,
    "emails_attempted": 4,
    "emails_succeeded": 4,
    "emails_failed": 0
  },
  "errors": []
}

Partial success returns ok=true with populated errors[].

6) Data Flow
Reads
TRN_Posting (existence check)
TRN_Survey (validate ownership)
TRN_ShareSession (enrollment)
TRN_SurveyRecipient (existing pairs)
MST_User (email + participant name)
MST_EmailTemplate (SURVEY_INVITE, SURVEY_REMINDER)
Writes (dry_run=false)
TRN_SurveyRecipient (insert or update SentOn)
TRN_EmailDeliveryLog (one row per attempt)

7) Server Actions (Step-by-Step)
Step 1 — Validate Input
Invalid fields → BAD_REQUEST

Step 2 — Validate Posting
Query TRN_Posting by posting_id
If not found → NOT_FOUND

Step 3 — Validate Surveys
Query TRN_Survey where SurveyId IN (survey_ids)
If any missing → NOT_FOUND
If any survey.PostingId ≠ posting_id → BAD_REQUEST
If enforcing IsActive and inactive found → BAD_REQUEST

Step 4 — Compute Enrolled Users
Query TRN_ShareSession where PostingId = posting_id
Select distinct UserId
Compute:
target_user_ids = intersection(request.user_ids, enrolled_user_ids)

For each non-enrolled user:
Add NOT_ENROLLED error
Increment pairs_skipped_not_enrolled

Step 5 — Expand Pair Set
pairs = survey_ids × target_user_ids

Compute:
surveys_requested
users_requested
pairs_requested
pairs_enrolled

Step 6 — Dry Run Short Circuit
If dry_run=true:
Optionally compute estimated created vs existing
Return counts
No writes
No emails

Step 7 — Load Existing Recipients
Query TRN_SurveyRecipient
Where SurveyId IN (...) AND UserId IN (...)
Build lookup map keyed by (survey_id, user_id)

Step 8 — Decide Action Per Pair
Definitions:
missing = no recipient row
existing = recipient row exists
Mode logic:
SEND_MISSING
missing → insert + email
existing → skip
RESEND_EXISTING
missing → skip
existing → update SentOn + email
SEND_AND_RESEND
missing → insert + email
existing → update SentOn + email

Step 9 — DB Writes
Insert missing recipients in batch:
Generate RecipientToken (opaque, high entropy, URL-safe)
SentOn = now()
Update existing recipients when required:
SentOn = now()

Step 10 — Load Templates
Load from MST_EmailTemplate:
SURVEY_INVITE
SURVEY_REMINDER
If missing/inactive:
Log FAILED for affected emails
ErrorCode = MISSING_EMAIL_TEMPLATE

Step 11 — Load Personalization Data
Batch query MST_User:
UserId
Email
Display name (for {{participant_name}})
Load researcher name from survey.CreatedBy

Step 12 — Render Email
Replace placeholders:
{{participant_name}} (fallback "Participant")
{{researcher_name}}
{{survey_title}}
{{study_title}}
{{study_id}}
{{survey_link}}
survey_link must be:
APP_BASE_URL + "/survey_redirect/" + recipient_token


Step 13 — Send Emails + Log
For each email attempt:
Increment emails_attempted
If email missing:
emails_failed++
Insert TRN_EmailDeliveryLog:
SendStatus=FAILED
ErrorCode=EMAIL_MISSING
Else if provider not configured:
emails_failed++
Insert TRN_EmailDeliveryLog:
SendStatus=FAILED
ErrorCode=EMAIL_NOT_CONFIGURED
Else attempt provider:
If success:
emails_succeeded++
Insert TRN_EmailDeliveryLog:
SendStatus=SENT
If failure:
emails_failed++
Insert TRN_EmailDeliveryLog:
SendStatus=FAILED
ErrorCode=EMAIL_PROVIDER_ERROR
ErrorMessage truncated
No retries inside this endpoint (MVP).

8) Constraints / Invariants
Only enrolled users may receive dispatch
All surveys must belong to posting_id
Only one TRN_SurveyRecipient row per pair
RecipientToken generated only on insert
Emails contain exactly one actionable link
Never expose internal identifiers in email body
Never log full RecipientToken

9) Edge Cases
Scenario
Behavior
User not enrolled
Skip + NOT_ENROLLED
SMTP missing
Rows created, emails_failed++, log FAILED
Email missing
Log FAILED with EMAIL_MISSING
Template missing
Log FAILED with MISSING_EMAIL_TEMPLATE
Repeated SEND_MISSING
No duplicates created
Repeated SEND_AND_RESEND
Resends occur


10) Observability
Log one structured line:
fn=survey_dispatch
posting_id
mode
dry_run
surveys_requested
users_requested
pairs_requested
users_enrolled
pairs_enrolled
recipients_created
recipients_existing
emails_attempted
emails_succeeded
emails_failed
delivery_log_rows_written
elapsed_ms
ok

Never log RecipientToken.

11) Test Checklist
Validation:
Missing fields → BAD_REQUEST
Invalid mode → BAD_REQUEST
Pair cap exceeded → BAD_REQUEST
Ownership:
Survey not found → NOT_FOUND
Survey from different posting → BAD_REQUEST
Mode semantics:
SEND_MISSING only creates missing
RESEND_EXISTING only resends existing
SEND_AND_RESEND does both
Idempotency:
Running SEND_MISSING twice creates 0 new rows second time
Email failure:
Missing SMTP → ok=true, emails_failed > 0
Missing email → FAILED logged
Dry run:
No writes
No email logs
Only counts returned

This version is now:
Deterministic
Logging-complete
Template-integrated
Fully implementable
No ambiguity left for developers
API 9: survey_dispatch_view/{postingId}

1) Purpose
Return all data required to render the Survey Dispatch Center for a specific posting (study).
This endpoint provides:
All surveys created under the posting
All currently enrolled participants (paged)
The full per-participant × per-survey status grid
Complete send/open tracking fields required for the UI
Internal user_id values (for dispatch API calls only — never displayed)
This endpoint does not write any data. It is read-only.
This endpoint is used by:
The Dispatch Center page (posting-level)
The UI that calls POST survey_dispatch

2) Method / Path
GET survey_dispatch_view/{postingId}

Example:
GET survey_dispatch_view/1?page=1&page_size=50


3) Inputs
Path Parameters (required)
Name
Type
Description
postingId
int
The PostingId of the study

Validation:
Must be a positive integer.

Query Parameters (optional)
Name
Type
Default
Description
page
int
1
Participant page number
page_size
int
50
Participants per page (max 200)

Validation rules:
page >= 1
1 <= page_size <= 200
Pagination applies to participants only (not surveys).

4) Output (Success)
{
  "ok": true,
  "posting": {
    "posting_id": 1
  },
  "surveys": [
    {
      "survey_id": 12,
      "posting_id": 1,
      "title": "Week 1 Survey",
      "is_active": true,
      "created_on": "2026-02-18T01:00:00Z",
      "modified_on": "2026-02-18T01:20:00Z"
    }
  ],
  "participants": {
    "page": 1,
    "page_size": 50,
    "total": 120,
    "items": [
      {
        "user_id": 7,
        "participant_id": "p_abcd123"
      }
    ]
  },
  "recipient_status": [
    {
      "survey_id": 12,
      "user_id": 7,
      "sent_on": "2026-02-18T02:00:00Z",
      "opened_on": "2026-02-18T05:10:00Z",
      "open_count": 1,
      "last_opened_on": "2026-02-18T05:10:00Z",
      "status": "OPENED"
    },
    {
      "survey_id": 13,
      "user_id": 7,
      "sent_on": null,
      "opened_on": null,
      "open_count": 0,
      "last_opened_on": null,
      "status": "NOT_SENT"
    }
  ]
}


5) Error Response (Standard)
{
  "ok": false,
  "code": "BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
  "message": "...",
  "details": {}
}


6) Status Semantics (Derived — No Status Column in DB)
Status is derived from TRN_SurveyRecipient:
Condition
Status
opened_on != null
OPENED
opened_on == null AND sent_on != null
SENT
No recipient row exists
NOT_SENT


7) Data Sources
Reads
TRN_Posting
TRN_Survey
TRN_ShareSession
TRN_SurveyRecipient
No Writes
This endpoint performs no inserts or updates.

8) Server Actions (Step-by-Step)
Step 1 — Validate Input
Validate postingId
Validate pagination parameters
If invalid → BAD_REQUEST

Step 2 — Validate Posting Exists
Query:
TRN_Posting WHERE PostingId = postingId

If not found → NOT_FOUND

Step 3 — Load Surveys
Query:
TRN_Survey WHERE PostingId = postingId
ORDER BY CreatedOn DESC

All surveys under the posting are returned.

Step 4 — Load Enrolled Participants (Paged)
Enrollment source:
TRN_ShareSession WHERE PostingId = postingId
SELECT DISTINCT UserId

Compute:
Total distinct enrolled users
Apply pagination (offset + limit)
For each user_id:
Compute participant_id using deterministic HMAC pseudonym rule

Step 5 — Load Existing Recipient Rows (For This Page)
Query:
TRN_SurveyRecipient
WHERE PostingId = postingId
AND SurveyId IN (survey list)
AND UserId IN (paged user ids)

Build lookup keyed by (survey_id, user_id).

Step 6 — Expand Full Grid
For each participant in the page:
For each survey:
If recipient row exists → return full metrics
Else → return:
sent_on = null
opened_on = null
open_count = 0
last_opened_on = null
status = NOT_SENT
This guarantees the UI receives a complete matrix.

9) Participant ID Computation (Required Consistency)
Participant IDs must match the existing deterministic pseudonym logic:
Message format (exact):
posting:<posting_id>:user:<user_id>

Algorithm:
HMAC-SHA256
Secret: PSEUDONYM_HMAC_KEY
Take first 16 bytes
Base64url encode (RFC 4648 URL-safe)
Prefix with p_
If PSEUDONYM_HMAC_KEY missing → SERVER_ERROR
Participant ID must never be stored in DB.

10) Internal Identifier Rules
user_id is returned only as an internal action key.
It must not be displayed in UI.
It is required for POST survey_dispatch.

11) Scalability & Limits
Pagination applies to participants only.
page_size max = 200.
Surveys are returned in full (expected small).
Recipient lookup must be performed in a single query (no N+1 loops).
Recommended indexes:
TRN_Survey(PostingId)
TRN_ShareSession(PostingId)
TRN_SurveyRecipient(PostingId)
TRN_SurveyRecipient(SurveyId, UserId)

12) Edge Cases
Scenario
Behavior
Posting has no surveys
surveys = []
Posting has no participants
participants.total = 0
Surveys exist but none sent
all grid cells = NOT_SENT
Some participants enrolled after survey creation
appear as NOT_SENT until sent
Missing HMAC key
SERVER_ERROR


13) Observability (Recommended Logging Fields)
Log:
fn=survey_dispatch_view
posting_id
page
page_size
surveys_count
participants_total
participants_returned
grid_cells_returned
elapsed_ms
ok

Do not log participant tokens or secrets.

14) Relationship to Other APIs
Used by: Dispatch Center UI
Works with: POST survey_dispatch
Complements: GET survey_recipients_list/{surveyId} (single survey drill-down)
Does not send emails
Does not modify recipient rows

