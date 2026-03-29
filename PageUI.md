
Page UI Documentation
(You may enhance layout, styling, and UI components.
However, all required functional sections, validation rules, navigation rules, and integration points described below must be implemented and must not be removed.) 
Page Documentation
Study Detail (Extended with Surveys Tab)
File
app/studies/[studyId]/index.tsx
Route
/studies/[studyId]

1. Page Overview
This is the primary study hub page.
It displays:
Study metadata
Participant/share information
Study-level management actions
A new Surveys tab (entry point to the survey module)
This page becomes the root navigation entry for all survey functionality within a study.

2. Navigation and Integration
Called From
app/studies.tsx (Studies listing page)
User selects a study → navigates to:
/studies/[studyId]
Navigates To (from Surveys tab):
/studies/[studyId]/surveys
/studies/[studyId]/surveys/create
/studies/[studyId]/surveys/dispatch
Required URL parameter
studyId (maps to postingId in backend APIs)

3. Layout Structure
The page must use a tab-based layout.
Required Tabs:
Overview (existing)
Participants / Shares (existing)
Surveys (new)
The Surveys section must be implemented as a tab, not just a button or inline section.

4. Surveys Tab – Required Layout
Header Section
Must include:
Title: “Surveys”
Short description explaining purpose:
“Manage surveys for this study. Create, dispatch, and monitor survey participation.”

Summary Strip
Must display:
Total surveys count
Active surveys count
If include_stats=true is used, optionally include:
Total recipients (aggregated)
Total opened (aggregated)
If aggregated totals are not implemented, survey count and active count are mandatory.

Recent Surveys Section
Display a limited number of recent surveys (recommended 3–5).
Each item must show:
Title
Active / Inactive badge
Created date
Optional quick stats:
recipients_total
opened_total
Each survey item must navigate to:
/studies/[studyId]/surveys/[surveyId]

Primary Actions
The following actions must be clearly visible:
View All Surveys
→ /studies/[studyId]/surveys
Create Survey
→ /studies/[studyId]/surveys/create
Dispatch Center
→ /studies/[studyId]/surveys/dispatch
These must not be hidden in overflow menus.

5. Required UI Components
Tabs
Summary cards or metric strip
Survey list (table or cards)
Status badges (Active / Inactive)
Primary action buttons
Empty state panel
Loading indicator for surveys tab

6. Data Display Requirements
Must display:
survey.title
survey.is_active
survey.created_on
If stats enabled:
stats.recipients_total
stats.opened_total
Must not display:
internal user_id
recipient tokens
participant IDs
This page is survey-level only.

7. Empty State Requirements
If no surveys exist:
Display:
Title:
“No surveys created yet.”
Description:
“Create your first survey to begin collecting structured feedback from participants.”
Primary action:
Create Survey
Optional:
Link to documentation/help.

8. Action Rules and UI Constraints
Surveys tab must load independently from other tabs.
Page must not fail entirely if surveys API fails.
If surveys API fails:
Show non-blocking error message inside Surveys tab.
Provide retry option.
Direct dispatching must not occur from this page. Users must navigate to Dispatch Center.

9. API Integration Summary
Existing APIs:
getTrnPostingDetail(buyerId, postingId)
getPostingShares(postingId)
New API required:
GET survey_list_by_posting/{postingId}
Recommended:
include_stats=true
Used to:
Count surveys
Display recent surveys
Display active status
Display quick stats
Call timing:
On page load, or
Lazy load when Surveys tab becomes active

10. Performance Requirements
Limit surveys displayed (e.g., first 5 only).
Do not load recipient-level data here.
Show loading indicator during fetch.
Avoid unnecessary re-fetch when switching tabs.

11. Audit and Logging Requirements
Track:
Study Detail page opened
Surveys tab opened
Create Survey clicked
View All clicked
Dispatch Center clicked
Do not log sensitive identifiers.

12. Security and Visibility Rules
studyId must scope all API calls.
Validate studyId exists before rendering.
Do not expose internal identifiers.
Prevent cross-study navigation.

13. Responsiveness Requirements
Must function on:
Desktop
Tablet
Smaller laptops
If using table:
Allow horizontal scroll
Avoid layout overflow
Buttons must be touch-friendly.

14. UI Consistency Requirements
Follow existing Study Detail styling.
Badge colors:
Active → green
Inactive → gray
Use existing theme configuration 

Surveys List Page (Posting-Level Overview)
File
app/studies/[studyId]/surveys/index.tsx
Route
/studies/[studyId]/surveys

1. Page Overview
This page lists all surveys created under a specific study.
It allows the researcher to:
View all surveys
See survey status and summary statistics
Navigate to a specific survey
Create a new survey
Navigate to Dispatch Center
This is the primary survey management entry point.

2. Navigation and Integration
Called From:
/studies/[studyId] → Surveys tab → View All Surveys
Optional: direct navigation via router
Navigates To:
/studies/[studyId]/surveys/create
/studies/[studyId]/surveys/dispatch
/studies/[studyId]/surveys/[surveyId]
Required URL Parameter:
studyId

3. Layout Structure
Single-column layout.
Required structural sections:
Page Header
Action Bar
Surveys Table
Empty State Panel (when applicable)

4. Header Section
Must include:
Page Title: “Surveys”
Study context indicator (optional but recommended):
Study title or breadcrumb:
Studies / Study Name / Surveys

5. Action Bar
Must include:
Primary actions:
Create Survey
→ /studies/[studyId]/surveys/create
Dispatch Center
→ /studies/[studyId]/surveys/dispatch
Optional (recommended):
Filter dropdown (Active / Inactive / All)
Search input (by survey title)

6. Surveys Table – Required Columns
Minimum required columns:
Title
Active Status (badge)
Created Date
Modified Date (optional but recommended)
Recipients Total (if stats enabled)
Opened Total (if stats enabled)
Actions column (View)
Each row must be clickable or include a “View” button linking to:
/studies/[studyId]/surveys/[surveyId]

7. Status Display Rules
Status must reflect is_active.
Display as badge:
Active → green
Inactive → gray
No additional status types required at this level.

8. Data Display Requirements
Must display:
survey.title
survey.is_active
survey.created_on
survey.modified_on (if returned)
If include_stats=true:
stats.recipients_total
stats.opened_total
Must not display:
internal user_id
recipient tokens
participant IDs

9. Empty State Requirements
If no surveys exist:
Display:
Title:
“No surveys created for this study.”
Description:
“Create your first survey to begin collecting structured responses.”
Primary button:
Create Survey
Optional secondary:
Return to Study Overview

10. Action Rules and UI Constraints
Survey title must navigate to survey detail page.
Create Survey button must always be visible.
Dispatch Center button must always be visible.
Inactive surveys must still be viewable.
No direct sending from this page (sending occurs via:
Survey Manage page, or
Dispatch Center page)

11. API Integration Summary
Primary API:
GET survey_list_by_posting/{postingId}
Recommended query parameters:
include_stats=true
page
page_size
optional: is_active filter
Data used:
Full survey list
Stats per survey (if enabled)
Call timing:
On page load
On filter change
On pagination change
Pagination:
Server-side pagination required
page_size recommended default: 25
max: 200

12. Performance Requirements
Must support pagination.
Must not load all surveys if dataset grows large.
Stats must be aggregated on backend (no client-side heavy computation).
Loading state must be visible during fetch.

13. Audit and Logging Requirements
Log:
Surveys List page opened
Create Survey clicked
Dispatch Center clicked
Survey row clicked
Do not log sensitive data.

14. Security and Visibility Rules
studyId must scope all API calls.
Validate studyId exists.
Prevent navigation to surveyId not belonging to this study.
Never expose internal identifiers.

15. Responsiveness Requirements
Table must support horizontal scroll on small screens.
On narrow viewports, may convert table to stacked cards.
Buttons must be accessible on touch devices.

16. UI Consistency Requirements
Use consistent styling with Study Detail page.
Use consistent badge colors.
Use consistent spacing and card/table style.

Survey Create Page
File
app/studies/[studyId]/surveys/create.tsx
Route
/studies/[studyId]/surveys/create

1. Page Overview
This page allows a researcher to create a new survey attached to a specific study.
It collects:
Survey title
parameterized form URL
It enforces strict validation to ensure:
The external form contains the required participant ID field
The correct Parameter key is extracted
The survey is properly linked to the study
This page must include instructional and confirmation safeguards.

2. Navigation and Integration
Called From:
/studies/[studyId]/surveys (Create Survey button)
/studies/[studyId] → Surveys tab → Create Survey
Navigates To (on success):
/studies/[studyId]/surveys/[surveyId]
Required URL parameter:
studyId

3. Layout Structure
Single-column structured form layout.
Required structural sections:
Page Header
Instruction / Tutorial Section
Survey Form
Email Options Section (message toggle + message text)
Email Preview Section
Compliance Confirmation Section
Action Buttons


4. Header Section
Must include:
Page title: “Create Survey”
Study context (breadcrumb recommended):
Studies / Study Name / Surveys / Create

5. Instruction / Tutorial Section (Mandatory)
This section must appear above the form.
It must clearly explain:
The survey must be created using an external survey provider.
The researcher must generate a parameterized or prefilled form URL from that provider.
The URL pasted must contain exactly one parameterized query parameter that the system can populate automatically.
Only one supported parameter key is allowed.

This section must include:
Step-by-step bullet instructions.
Optional expandable help panel.
Optional embedded help video or documentation link (if available).
This section must not be collapsible by default on first visit.

6. Survey Form Fields
Field 1 — Survey Title
Type: Text input
Required: Yes
Validation:
Non-empty
Max length recommended (e.g., 200 characters)

Field 2 — Parameterized form URL
Type: Text input
Required: Yes
Validation rules:
Must be valid URL format.
Must contain parameterized query parameter.
Must contain exactly one parameterized query parameter.
If validation fails:
Show inline error message.
Disable Create button.

7. Email Options Section (Mandatory UI Controls)
This section must appear below the Survey Form fields and above Compliance Confirmation.
Purpose:
Allow the researcher to optionally author a custom message to be included when sending survey emails.
Controls:
Checkbox:
“Include a custom message in the email”
Field name (UI state):
include_message (boolean)
Default:
Unchecked
Textarea (enabled only when include_message=true):
Label:
“Message text”
Field name (UI state):
message_text (string)
Validation:
If include_message=true:
message_text is required (non-empty after trim)
If include_message=false:
message_text must be ignored/cleared by UI

Important behavioral rule (MVP):
This message is NOT saved during survey_create.
This message applies only when the researcher triggers send actions later:
POST survey_send/{surveyId}
POST survey_dispatch

8. Compliance Confirmation Section (Mandatory)

Before enabling submission, the page must require confirmation:

Required checkbox 1 (Form correctness):
““I confirm that my survey provider form supports parameterized or prefilled values and that I generated the correct parameterized form URL..”

Required checkbox 2 (Email appropriateness / compliance):
“I confirm the email content I will send to participants is appropriate and contains no sensitive or internal identifiers.”

Create button enablement rule:
The Create button must remain disabled until both required checkboxes are selected.


9. Email Preview Section (Mandatory)
This section must appear below Email Options and above Action Buttons.
Purpose:
Allow researchers to preview the email content that would be sent during later send actions (Survey Manage bulk send or Dispatch Center), using safe sample placeholder values.
Preview must display:
Rendered Subject
Rendered Body (plain text at minimum; HTML optional if supported)
A clear indicator of whether a survey link will be included
Template selection rules for preview:
Default to SURVEY_INVITE template preview.
If the UI offers a “resend” mode later, reminder preview may be shown on the manage/dispatch pages.
Preview rendering rules:
Placeholders must be shown using safe sample values (do not use any real participant data):
{{participant_name}} → “Participant”
{{researcher_name}} → current researcher display name if available, else “Researcher”
{{survey_title}} → current title input value
{{study_title}} → study name if available, else “Study”
{{study_id}} → studyId
{{survey_link}} → example link format using APP_BASE_URL and a placeholder token

Custom message preview behavior:
If include_message=true, the preview must include the message_text in the same position it will appear in the final email.

Template availability warning:
If required templates are missing or inactive, show a visible warning and render the preview using a placeholder layout:
SURVEY_INVITE
SURVEY_REMINDER
10. Action Buttons
Primary button:
Create Survey
Secondary button:
Cancel → return to /studies/[studyId]/surveys
Create Survey button behavior:
Disabled until:
All fields valid
Confirmation checkbox checked
On click:
Show confirmation modal:
“Are you sure you want to create this survey for this study? This will not send any emails.”

If confirmed:
Call API
Show loading state
On success → navigate to survey manage page
On error → show error banner

11. API Integration Summary
Primary API:
POST survey_create
Request body:
posting_id (mapped from studyId)
title
parameterized_form_url
On success:
Response returns:
survey_id
posting_id
created_by
title
form_responder_url
participant_param_key
is_active
created_on
Redirect to:
/studies/[studyId]/surveys/[surveyId]
Error handling:
BAD_REQUEST → show validation error
NOT_FOUND → show study not found error
CONFLICT → show duplicate title message
SERVER_ERROR → show generic failure banner

12. Validation Requirements (Strict)
Client-side validation must include:
URL parsing
Presence of a parameterized query parameter
Single entry key enforcement
However, server remains authoritative.
Even if client passes validation, server must still validate.
Error messages must be specific:
Example:
Please paste the external survey provider parameterized form URL that contains a supported query parameter.

13. Performance Requirements
No heavy data loading required.
Show loading spinner during API call.
Disable form inputs during submission.
Prevent duplicate submissions.

14. Audit and Logging Requirements
Log:
Survey Create page opened
Survey creation attempted
Survey creation success
Survey creation failure
Do not log full external form URL or entry key in analytics logs.

15. Security and Visibility Rules
studyId must map to postingId.
Never allow posting_id to be manually edited.
created_by must not be supplied from frontend.
Create page email-message rule:
Do not store include_message or message_text during survey_create.
Custom message content (if any) is stored only when sending, via TRN_SurveyMessageEvent (encrypted) during survey_send or survey_dispatch.
Do not expose internal IDs in UI.
Do not display participant_param_key after creation (unless required in manage page).

16. Responsiveness Requirements
Form must stack vertically on small screens.
Instruction panel must remain readable.
Buttons must be full-width on narrow screens.

17. UI Consistency Requirements
Follow existing form styling patterns.
Inline error messages must match theme.
Disabled button styling consistent with rest of app.

Survey Manage Page (Single Survey)
File
app/studies/[studyId]/surveys/[surveyId]/index.tsx
Route
/studies/[studyId]/surveys/[surveyId]

1. Page Overview
This page is the main management view for a single survey under a study. It shows the survey’s core details, status, and provides navigation to:
Recipient status list (who was sent / opened)
Dispatch Center (posting-level grid for catch-up / selective sending)
This page supports a “Send to all enrolled” action for this survey (bulk send).
Targeted send/resend remains in Dispatch Center.

2. Navigation and Integration
Called From:
/studies/[studyId]/surveys (survey list)
/studies/[studyId]/surveys/create (after successful creation)
/studies/[studyId]/surveys/dispatch (optional deep-link back to the selected survey)
Navigates To:
Recipients table: /studies/[studyId]/surveys/[surveyId]/recipients
Dispatch center: /studies/[studyId]/surveys/dispatch
Back: /studies/[studyId]/surveys
Required URL parameters:
studyId
surveyId

3. Layout Structure
Multi-section layout (responsive):
Survey Summary Card (top)
Quick Stats + Status
Send Email to All (bulk send) card
Navigation Actions (Recipients, Dispatch Center, Message History)
Recommended structure:
Header with breadcrumb + title
Survey details card
Stats row
Send-to-all card (message toggle + preview + confirmation + send)
Primary navigation buttons section

4. Header Section
Must include:
Page title: “Survey”
Breadcrumb:
Studies / Study Name / Surveys / Survey
Optional (recommended):
Back button to surveys list

5. Survey Details Card (Required Fields)
Display fields:
Title
Survey status (Active / Inactive)
Created On
Modified On
Optional display fields (only if product wants them visible):
Form Responder Url (masked / copy button)
Parameter key (masked / copy button)
If you display URL/key:
Do not render them as large raw text blocks.
Provide a copy-to-clipboard control.

6. Stats Section
If stats are available from the API response, show:
Recipients total
Opened total
If the API does not return stats for some reason:
Show “Stats unavailable” instead of showing incorrect zeros.

7. Send to All Enrolled (Bulk Send) (Required)
Purpose:
Bulk-send this survey to all currently enrolled participants for the posting (study).
This action uses POST survey_send/{surveyId}.
UI Controls:
A) Optional message controls
Checkbox:
“Include a custom message.”
State: include_message (boolean), default unchecked
Textarea (enabled only if include_message=true):
“Message text”
State: message_text (string)
Validation:
If include_message=true, message_text is required (non-empty after trim)

B) Preview (mandatory)
Show email preview using SURVEY_INVITE template (bulk send preview always uses SURVEY_INVITE).
Preview must reflect:
survey_title
study_title (if available)
survey link included (always true for bulk send)
optional message_text (only when include_message=true)
No real participant data in preview.

C) Safety/confirmation (mandatory)
Required checkbox:
“I confirm this email is appropriate and contains no sensitive or internal identifiers.”
Send button disabled until checkbox is checked.

On click “Send to All”:
Open confirmation modal with summary:
Survey title
Study name
Whether message is included
Whether dry_run is enabled (if you expose it)
Confirm button triggers API call.

Optional advanced controls (only if backend supports them):
dry_run (default false)
limit (nullable)
force_resend (default false)
If these are not intended for researcher UI in MVP, omit them from UI and do not send them.

Post-send UI:
Show results summary using API response fields:
participants_found
recipients_created
recipients_existing
message_recipients_created
emails_attempted
emails_succeeded
emails_failed
Show errors[] list if present.

8. Primary Actions
Required actions:
1) View Recipients
Button label: “View Recipients”
Navigates to: /studies/[studyId]/surveys/[surveyId]/recipients

2) Dispatch Center
Button label: “Dispatch Center”
Navigates to: /studies/[studyId]/surveys/dispatch
Note: Dispatch Center is posting-level, not survey-level.

3) Message History
Button label: “Message History”
Navigates to: /studies/[studyId]/message-history
Optional behavior (recommended):
Pre-apply filter survey_id=[surveyId] if the list page supports it.

Optional actions (only if supported by backend):
Deactivate / Activate survey
Only include if you have (or will add) an API for changing TRN_Survey.IsActive.
If no API exists, do not include toggle controls.

9. Empty / Edge States
Survey not found:
Show error state and a Back button to /studies/[studyId]/surveys
Survey exists but was never sent:
Recipients total = 0
View Recipients works and shows empty list
“Send to All” is available and will create recipients when executed
Survey inactive:
Display “Inactive” badge prominently
Dispatch Center should still be accessible (so admin can see history), but sending behavior depends on backend rules.

10. API Integration Summary
A) GET survey_get/{surveyId}

Called on page load using surveyId from route params.
Response fields used:
survey_id
posting_id
created_by
title
form_responder_url (optional)
participant_param_key (optional)
is_active
created_on
modified_on
stats.recipients_total (optional)
stats.opened_total (optional)

Validation:
If returned survey.posting_id does not match studyId, show “Mismatch” error and block actions.

B) POST survey_send/{surveyId} (bulk send)
Triggered by “Send to All Enrolled”.
Request body (optional fields):
dry_run
limit
force_resend
include_message
message_text (required if include_message=true)

Response fields used:
message_event_id
results (counts)
errors[]

11. Performance Requirements
Single API call on load.
Show skeleton/loading spinner while loading.
Cache is optional, but refresh should be possible (pull-to-refresh or refresh button).

12. Audit and Logging Requirements
Log events:
Survey manage page opened (studyId, surveyId)
Navigation clicks:
View Recipients clicked
Dispatch Center clicked
Message History clicked
Bulk send events:
Send-to-all preview viewed (no message content logged)
Send-to-all attempted (do not log message_text)
Send-to-all success (counts only)
Send-to-all failure (error codes only)
Do not log the full URL if displayed.

13. Responsiveness Requirements
On narrow screens: stack cards vertically
Actions should become full-width buttons on mobile

Survey Recipients List Page (Single Survey)
File
app/studies/[studyId]/surveys/[surveyId]/recipients.tsx
Route
/studies/[studyId]/surveys/[surveyId]/recipients

1. Page Overview
This page shows the recipient table for one survey (one row per participant who has a TRN_SurveyRecipient row). It is used by researchers/admins to verify:
who was sent the survey
who opened the survey link
open counters/timestamps (MVP “submitted” = opened)
It is a read-only monitoring view. Sending actions happen in the Dispatch Center.

2. Navigation and Integration
Called From:
/studies/[studyId]/surveys/[surveyId] (Survey Manage page)
Navigates To:
Back: /studies/[studyId]/surveys/[surveyId]
Dispatch Center (optional link/button): /studies/[studyId]/surveys/dispatch
Required URL parameters:
studyId
surveyId

3. Layout Structure
Recommended layout:
Header with title + back button
Filters row (status + search)
Recipients table
Pagination controls (if total > page_size)

4. Header Section
Must include:
Title: “Recipients”
Survey context line (recommended): “Survey: ” (if available)
Back button
If you don’t want an extra API call for title:
show “Survey ID: ” instead

5. Table Columns (Required)
Each recipient row must show:
Participant ID (p_… pseudonym)
Status
OPENED if opened_on exists
SENT if sent_on exists and opened_on is null
NOT_SENT should not appear here normally because rows only exist when recipients exist, but keep logic defensive
Sent On (local formatted)
Opened On (local formatted or “-”)
Open Count (integer)
Last Opened On (local formatted or “-”)
Do not show internal user_id.

6. Filters and Controls (Required)
Status filter
Options:
All
Sent
Opened
Mapping:
Sent => status=sent
Opened => status=opened
Search box (recommended)
Searches within Participant Id (client-side is fine for a single page)
Pagination controls (required if API paginates)
page
page_size selector (optional; max 200)

7. Empty / Edge States
No recipients yet:
Show “No recipients found for this survey.”
Provide navigation back to survey manage page
Provide link/button to Dispatch Center
API error:
Show error message + retry button

8. API Integration Summary
Primary API:
GET survey_recipients_list/{surveyId}
Called on:
initial load
filter changes (status/page/page_size)
refresh/retry
Query params used:
status=sent|opened (optional)
page (default 1)
page_size (default 50, max 200)
Response fields used:
survey_id
posting_id (recommended to validate vs studyId)
page, page_size, total
recipients[]:
survey_recipient_id
participant_id
sent_on
opened_on
open_count
last_opened_on
status
Validation rule:
If response.posting_id does not match studyId, show mismatch error and stop rendering (prevents cross-study mixups).

9. Performance Requirements
Must use pagination. Do not attempt to load all recipients if total is large.
page_size max 200 to keep response and UI fast.
Avoid heavy client-side sorting on large pages; prefer API ordering defaults.

10. Audit and Logging Requirements
Log:
page open (studyId, surveyId)
status filter changes
pagination changes
Do not log participant_id lists.

11. Responsiveness Requirements
On mobile:
table becomes stacked cards, or horizontally scrollable table
Filters should wrap and remain usable

Survey Dispatch Center Page (Posting-Level)
File
app/studies/[studyId]/surveys/dispatch.tsx
Route
/studies/[studyId]/surveys/dispatch

1. Page Overview
This page is the posting-level “Survey Dispatch Center”. It lets the researcher:
see all surveys under the study (posting)
see enrolled participants (paged)
see the per-participant × per-survey status grid
select surveys + participants and trigger dispatch (send missing / resend / send+resend)
This is the main operational page for sending surveys and doing catch-up.

2. Navigation and Integration
Called From:
/studies/[studyId] (Study Detail page) via “Surveys” tab or “Dispatch Surveys” button
/studies/[studyId]/surveys (Survey List page) via “Dispatch Center” button
/studies/[studyId]/surveys/[surveyId] (Survey Manage page) via “Dispatch Center” button
/studies/[studyId]/surveys/[surveyId]/recipients via “Dispatch Center” button (optional)
Navigates To:
Back: /studies/[studyId]/surveys (recommended default)
Survey Create: /studies/[studyId]/surveys/create
Survey Manage: /studies/[studyId]/surveys/[surveyId]
Required URL params:
studyId

3. Layout Structure
Recommended layout:
Header
Surveys overview strip (left/top)
Participant list (paged) + selection controls
Status grid (matrix)
Dispatch action bar (sticky at bottom)
Email Options section (include_link + include_message + message_text)
Email Preview section (template + placeholders + optional message + link indicator)
Dispatch confirmation modal
Dispatch results panel (after run)

4. Header Section (Required)
Must include:
Title: “Survey Dispatch Center”
Study context: “Study ID: ” (or study title if already available)
Buttons:
“Create Survey”
“Back to Surveys” (or “Back to Study”)

5. Data Display Requirements
A) Surveys List Panel (Required)
Show all surveys returned by the view API:
For each survey:
title
is_active badge
created_on (optional)
quick link: “Manage” -> /studies/[studyId]/surveys/[surveyId]
Also provide:
survey multi-select (checkboxes)
“Select all surveys” / “Clear”
B) Participants Panel (Required)
Participants must be paginated.
For each participant item:
participant_id (p_…)
internal user_id must not be displayed, but can exist in state for dispatch calls
selection checkbox
Also provide:
“Select all on page”
“Clear selection”
search by participant_id (client-side filter on current page is fine)
C) Status Grid (Required)
The page must show a matrix for selected participants and surveys.
Each cell must show:
NOT_SENT / SENT / OPENED
Definition:
NOT_SENT means no TRN_SurveyRecipient exists for (survey_id, user_id).
Note: The participants list returned by survey_dispatch_view must include only enrolled participants for this posting; non-enrolled users must not appear in the grid.
If NOT_ENROLLED appears in survey_dispatch results, it represents a race condition or stale UI selection (for example, enrollment removed after view load) or a manual API call, not normal grid population.
optional: sent_on tooltip
optional: opened_on tooltip
optional: open_count
Important:
For performance, the grid should be built only for the current participant page.
If no surveys exist, show an empty state with a “Create Survey” CTA.

6. Email Options (Required UI Controls)
Purpose:
Allow the researcher to choose whether the dispatch email includes:
- the survey link (include_link)
- a custom message (include_message + message_text)
Controls:
A) Include link toggle (dispatch-only)
Checkbox:
“Include survey link”
State: include_link (boolean)
Default: Checked (recommended)
B) Optional custom message
Checkbox:
“Include a custom message”
State: include_message (boolean), default unchecked
Textarea (enabled only when include_message=true):
“Message text”
State: message_text (string)
Validation:
If include_message=true: message_text is required (non-empty after trim)

Behavior rules:
- include_link is allowed ONLY for survey_dispatch (do not add to survey_send).
- If include_message=false, message_text must be ignored/cleared by UI.
- The message applies only to this dispatch action (not automatically reused later).

7. Email Preview (Required)
Purpose:
Allow researchers to preview the email content that would be sent for the dispatch action.

Preview must display:
- Rendered Subject
- Rendered Body (plain text minimum; HTML optional)
- A clear indicator whether the survey link will be included (include_link)

Template selection rules for preview:
- For SEND_MISSING: preview SURVEY_INVITE (default)
- For RESEND_EXISTING: preview SURVEY_REMINDER (default)
- For SEND_AND_RESEND: show both previews (Invite + Reminder) OR show a toggle between them

Preview rendering rules:
Placeholders must use safe sample values (no real participant data):
{{participant_name}} → “Participant”
{{researcher_name}} → current researcher display name if available, else “Researcher”
{{survey_title}} → “Selected survey” (or show the first selected survey title and indicate “+N more”)
{{study_title}} → study name if available, else “Study”
{{study_id}} → studyId
{{survey_link}} → example link format using APP_BASE_URL and a placeholder token (shown only if include_link=true)

Custom message preview behavior:
If include_message=true, the preview must include message_text in the same position it will appear in the final email.

Implementation note:
Email preview MUST be generated using the survey_email_preview API (defined in API docs). The UI must not construct final preview content from hardcoded templates.

8. Dispatch Actions (Required)

Dispatch action bar must include:
A) Mode selector (required)
SEND_MISSING
RESEND_EXISTING
SEND_AND_RESEND

B) Dispatch button (required)
Disabled unless:
- at least 1 survey selected
- at least 1 participant selected
- if include_message=true then message_text is valid

C) Dry-run toggle (optional but recommended)
Recommended flow:
1) Run dry_run=true to preview counts and skipped reasons
2) Show confirmation modal
3) On confirm, run dry_run=false

D) Confirmation modal (required before dry_run=false)
Modal must clearly state:
- surveys selected count
- participants selected count
- total pairs = surveys × participants
- mode selected
- include_link value
- include_message value (and whether message_text is present)
- warning about email sending

If confirmed:
Call POST survey_dispatch with:
posting_id
survey_ids
user_ids
mode
dry_run
include_link
include_message
message_text (only if include_message=true)


9. Dispatch Results Display (Required)

After a dispatch call, show:
- message_event_id (returned by API; this ties to TRN_SurveyMessageEvent)
- recipients_created
- recipients_existing
- message_recipients_created
- emails_attempted
- emails_succeeded
- emails_failed
- errors[] summary

Messaging outcomes:
- Skipped users (NOT_ENROLLED / mode-based skips / already-sent skips) must be reflected in results and/or errors summary.
  “Already-sent skip” means TRN_SurveyRecipient exists and mode/force rules say “do not send”

- Missing email behavior:
  - emails_attempted does NOT include missing-email cases (no provider attempt)
  - these pairs must still appear in errors[] and in Message History as FAILED with attempted_on = NULL and failure_code = "MISSING_TO_EMAIL"

UI messaging:
If skipped not enrolled exists:
Show “Some selected users are not enrolled and were skipped.”
If EMAIL_NOT_CONFIGURED exists:
Show warning banner “Email is not configured; dispatch could not send emails.”
If emails_failed > 0:
Show a collapsible “View failures” section listing per-item errors.


10. API Integration Summary
A) Load View Data (Required)
GET survey_dispatch_view/{postingId} (postingId = studyId)
Called on:
initial load
participant page/page_size change
refresh button
Query params:
page (default 1)
page_size (default 50, max 200)
Response fields used:
surveys[]
participants.items[] (participant_id + user_id internal)
participants.total
recipient_status[] (grid rows)
Rules:
Do not display user_id
Keep user_id in memory only to call dispatch API
B) Dispatch (Required)

POST survey_dispatch

Triggered by:

Dispatch button after confirmation

Payload:

posting_id = studyId
survey_ids = selected surveys
user_ids = selected internal user ids
mode
dry_run (optional)
include_link (boolean)
include_message (boolean)
message_text (string; required only if include_message=true)

Response fields used:
message_event_id
results (counts)
errors[]


11. Validation Rules (UI)
Before dispatch call:
Must select at least 1 survey
Must select at least 1 participant
If include_message=true: message_text must be non-empty after trim
Must block if pairs count exceeds your documented cap (if enforced by backend)
Show: “Too many selections. Reduce users or surveys.”
After view load:
If response.posting_id mismatches studyId (if included), block and show error.

12. Empty / Edge States
No surveys exist
Show message: “No surveys created yet.”
Show “Create Survey” button
No participants enrolled
Show message: “No enrolled participants found for this study.”
Still show surveys panel (surveys can exist even if participants are 0)
Grid has no cells (nothing selected)
Show helper text: “Select surveys and participants to see the status grid.”

13. Performance Requirements
Pagination must apply to participants; never attempt to load all participants at once.
Grid must render only current page participants.
Debounce search input (client-side) to avoid re-render storms.
Avoid rendering full recipient_status list if large; normalize to a lookup map keyed by (survey_id, user_id).

14. Audit and Logging Requirements
Log:
page open (studyId)
view page changes (page/page_size)
dispatch attempt (counts only: surveys_selected, participants_selected, pairs_requested, mode, dry_run, include_link, include_message)
Do not log message_text
dispatch result summary (counts only)
Never log:
recipient tokens
full user_id lists

15. Responsiveness Requirements
On small screens:
Surveys panel collapsible accordion
Participants list as cards
Grid as horizontally scrollable table or “selected survey -> list statuses” toggle view


Message History List Page
File: app/studies/[studyId]/message-history/index.tsx
 Route: /studies/[studyId]/message-history
1. Page Overview
Researcher audit view listing all message events for a study (posting). Shows delivery summaries and lets the researcher drill into event details.
2. Navigation and Integration
Called From:
Dispatch Center: /studies/[studyId]/surveys/dispatch (Message History button)


Survey Manage: /studies/[studyId]/surveys/[surveyId] (Message History button, optionally filtered)


Navigates To:
Detail: /studies/[studyId]/message-history/[messageEventId]


Back: typically to Dispatch Center or Surveys list (choose consistent app behavior)


Required URL params: studyId
Optional query params:
survey_id (filters list to events for one survey where applicable)


3. Layout Structure
Header (title + breadcrumb)


Filters row (optional but recommended)


Events table/list (paged)


Empty/error state blocks


4. Header Section
Must include:
Title: “Message History”


Study context (studyId or title)


Back button (recommended): “Back to Dispatch Center”


5. Filters (Recommended)
Survey filter (dropdown):


“All surveys”


each survey title


Event source filter (dropdown):


All


SURVEY_SEND


DISPATCH_CENTER


CUSTOM_MESSAGE (only if used)


Pagination controls: page, page_size


6. Events List Display (Required)
For each event row show:
Created on (timestamp)


Event source (badge)


Dispatch mode (if event_source=DISPATCH_CENTER)


Survey context:


If event has SurveyId: show survey title


If SurveyId is null: show “Multiple surveys”


Include link: true/false


Include message: true/false


If true: show “Message included” (do not show full text by default)


Optional: show message preview (first N chars) only if backend returns it safely


Summary counts:


pairs_evaluated (field name in API may remain "targeted" but it MUST mean: count of TRN_SurveyMessageRecipient rows created for the event, including SKIPPED_* and FAILED; this value MUST equal the total recipients row count for that message_event_id)


sent


failed


skipped


Row click navigates to detail page.
7. API Integration Summary
Primary API: GET message_history_by_posting/{postingId} (postingId = studyId)
Optional query params:
survey_id


event_source


page


page_size


Response fields used:
message_event_id


created_on


created_by


event_source


dispatch_mode


survey_id (nullable)


include_link


include_message


message_preview (optional; only if provided)


summary.targeted / sent / failed / skipped


8. Empty / Edge States
No events: show “No messages have been sent yet.” + link to Dispatch Center


API error: show error banner + Retry


Posting mismatch: if response includes posting_id and differs from studyId, block display + show error


9. Audit and Logging Requirements
Log:
Page opened (studyId)


Filter changes (filter values only)


Row click (message_event_id)


Never log:
message text


participant identifiers


user_id lists



Message History Detail Page
File: app/studies/[studyId]/message-history/[messageEventId].tsx
 Route: /studies/[studyId]/message-history/[messageEventId]
1. Page Overview
Shows the full audit record for one message event (metadata + optional decrypted message text) and per-recipient outcomes.
2. Navigation and Integration
Called From:
Message History list


Navigates To:
Back: /studies/[studyId]/message-history


Required URL params:
studyId


messageEventId


3. Layout Structure
Header (breadcrumb + title)


Event summary card


Message content panel (only if include_message=true)


Recipients outcomes table (paged or virtualized)


Export button (optional)


4. Event Summary Card (Required)
Display:
message_event_id


created_on


created_by (display name if available)


event_source


dispatch_mode (if any)


survey context:


if survey_id not null: show title + link to survey manage page


if null: show “Multiple surveys”


include_link (true/false)


include_message (true/false)


5. Message Content Panel (Conditional)
If include_message=true:
Show message_text returned by API (authorized researcher only)
 If include_message=false:


Hide panel or show “No custom message was included.”


Do not allow copy of internal IDs. Copying message text is allowed if product permits.
6. Recipient Outcomes Table (Required)
Each row shows:
participant_id (computed pseudonym from backend response)


survey_id (if relevant for dispatch multi-survey; else can be omitted for SURVEY_SEND)


outcome_status (badge)


skip_reason (only when outcome_status starts with SKIPPED_)


attempted_on (nullable)


completed_on (required; timestamp when the system finalized the outcome for this recipient row. For SENT/FAILED this may be the delivery-attempt completion time; for SKIPPED_* or FAILED with attempted_on = NULL, this is the time the system recorded the skip/failure.)


Failure reason display rule (REQUIRED):
If outcome_status = FAILED:

A) If attempted_on IS NOT NULL (provider attempt happened):
- The backend MUST return failure_code for that row, derived from TRN_EmailDeliveryLog.ErrorCode for the matching attempt.
- The UI MUST display failure_code (examples: EMAIL_PROVIDER_ERROR, MISSING_EMAIL_TEMPLATE, EMAIL_NOT_CONFIGURED, UNKNOWN_ERROR).

B) If attempted_on IS NULL (no provider attempt happened):
- This represents “missing ToEmail” (no TRN_EmailDeliveryLog row exists).
- The backend MUST return failure_code = "MISSING_TO_EMAIL" for this row.
- The UI MUST display failure_code = MISSING_TO_EMAIL.

Important:
- failure_code is a display field only; do not expose internal user_id or recipient_token.
- Do not use SkipReason for failures. SkipReason is for SKIPPED_* only.



7. API Integration Summary
Primary API: GET message_history_get/{messageEventId}
Validation:
 If event.posting_id != studyId, block and show mismatch error.
Response fields used:
event fields (metadata + include_message + message_text)


recipients[] rows (participant_id, survey_id, outcome_status, skip_reason, attempted_on, completed_on, failure_code when outcome_status=FAILED)


8. Performance Requirements
Recipient table should be paged or virtualized for large events


Loading skeleton while fetching


Retry on failure


9. Audit and Logging Requirements
Log:
Page opened (studyId, messageEventId)


Copy actions (optional) without storing copied content


Never log:
message_text


participant_id values
