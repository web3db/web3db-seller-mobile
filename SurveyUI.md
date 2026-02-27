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
Google prefilled URL
It enforces strict validation to ensure:
The Google Form contains the required participant ID field
The correct prefill entry key is extracted
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
The survey must include a Participant ID question.
The researcher must use Google Forms “Get pre-filled link.”
The URL pasted must contain exactly one entry.<digits> parameter.
Only one participant ID field is supported.
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

Field 2 — Google Prefilled URL
Type: Text input
Required: Yes
Validation rules:
Must be valid URL format.
Must contain entry.<digits> parameter.
Must contain exactly one entry.<digits> parameter.
Recommended: enforce hostname docs.google.com.
If validation fails:
Show inline error message.
Disable Create button.

7. Compliance Confirmation Section (Mandatory)
Before enabling submission, the page must require confirmation:
Required checkbox:
“I confirm that my Google Form includes a required Participant ID field and that I generated this link using the ‘Get pre-filled link’ option.”
The Create button must remain disabled until this checkbox is selected.

8. Action Buttons
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
“Are you sure you want to create this survey for this study?”
If confirmed:
Call API
Show loading state
On success → navigate to survey manage page
On error → show error banner

9. API Integration Summary
Primary API:
POST survey_create
Request body:
posting_id (mapped from studyId)
title
google_prefilled_url
On success:
Response returns:
survey_id
posting_id
created_by
title
google_form_responder_url
prefill_entry_key
is_active
created_on
Redirect to:
/studies/[studyId]/surveys/[surveyId]
Error handling:
BAD_REQUEST → show validation error
NOT_FOUND → show study not found error
CONFLICT → show duplicate title message
SERVER_ERROR → show generic failure banner

10. Validation Requirements (Strict)
Client-side validation must include:
URL parsing
Presence of entry.
Single entry key enforcement
However, server remains authoritative.
Even if client passes validation, server must still validate.
Error messages must be specific:
Example:
“Please paste the Google Forms prefilled link that includes a participant ID entry parameter.”

11. Performance Requirements
No heavy data loading required.
Show loading spinner during API call.
Disable form inputs during submission.
Prevent duplicate submissions.

12. Audit and Logging Requirements
Log:
Survey Create page opened
Survey creation attempted
Survey creation success
Survey creation failure
Do not log full Google URL or entry key in analytics logs.

13. Security and Visibility Rules
studyId must map to postingId.
Never allow posting_id to be manually edited.
created_by must not be supplied from frontend.
Do not expose internal IDs in UI.
Do not display prefill_entry_key after creation (unless required in manage page).

14. Responsiveness Requirements
Form must stack vertically on small screens.
Instruction panel must remain readable.
Buttons must be full-width on narrow screens.

15. UI Consistency Requirements
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
This page does not perform sending directly (sending happens via dispatch).

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
Two-section layout (responsive):
Survey Summary Card (top)
Actions + Quick Stats (below or side panel)
Recommended structure:
Header with breadcrumb + title
Survey details card
Status and stats row
Primary action buttons section

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
Google responder URL (masked / copy button)
Prefill entry key (masked / copy button)
If you display URL/key:
Do not render them as large raw text blocks.
Provide a copy-to-clipboard control.

6. Stats Section
If stats are available from the API response, show:
Recipients total
Opened total
If the API does not return stats for some reason:
Show “Stats unavailable” instead of showing incorrect zeros.

7. Primary Actions
Required actions:
View Recipients
Button label: “View Recipients”
Navigates to: /studies/[studyId]/surveys/[surveyId]/recipients
Open Dispatch Center
Button label: “Dispatch Center”
Navigates to: /studies/[studyId]/surveys/dispatch
Note: Dispatch Center is posting-level, not survey-level.
Optional actions (only if supported by backend):
Deactivate / Activate survey
Only include if you have (or will add) an API for changing TRN_Survey.IsActive.
If no API exists, do not include toggle controls.

8. Empty / Edge States
Survey not found:
Show error state and a Back button to /studies/[studyId]/surveys
Survey exists but was never sent:
Recipients total = 0
View Recipients still works and shows empty list
Survey inactive:
Display “Inactive” badge prominently
Dispatch Center should still be accessible (so admin can see history), but sending behavior depends on backend rules.

9. API Integration Summary
Primary API:
GET survey_get/{surveyId}
Called on page load using:
surveyId from route params
Recommended query params (if implemented):
include_stats=true
include_google_url=true (only if UI needs it)
Response fields used:
survey_id
posting_id
created_by
title
google_form_responder_url (optional)
prefill_entry_key (optional)
is_active
created_on
modified_on
stats.recipients_total (optional)
stats.opened_total (optional)
Validation:
If returned survey.posting_id does not match studyId, show “Mismatch” error and block actions (prevents cross-study mistakes).

10. Performance Requirements
Single API call on load.
Show skeleton/loading spinner while loading.
Cache is optional, but refresh should be possible (pull-to-refresh or refresh button).

11. Audit and Logging Requirements
Log events:
Survey manage page opened (studyId, surveyId)
Navigation clicks:
View Recipients clicked
Dispatch Center clicked
Do not log the full Google URL if displayed.

12. Responsiveness Requirements
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
Searches within participant_id (client-side is fine for a single page)
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
optional: sent_on tooltip
optional: opened_on tooltip
optional: open_count
Important:
For performance, the grid should be built only for the current participant page.
If no surveys exist, show an empty state with a “Create Survey” CTA.

6. Dispatch Actions (Required)
Dispatch action bar must include:
Mode selector (required)
SEND_MISSING
RESEND_EXISTING
SEND_AND_RESEND
Dispatch button (required)
disabled if no surveys selected or no participants selected
Dry-run toggle (optional but recommended)
calls dispatch with dry_run=true first, shows counts, then confirm to execute
Confirmation modal (required before actual send)
Modal must clearly state:
surveys selected count
participants selected count
total pairs = surveys × participants
mode selected
warning about email sending

7. Dispatch Results Display (Required)
After a dispatch call, show:
recipients_created
recipients_existing
emails_attempted
emails_succeeded
emails_failed
errors[] summary
If errors include NOT_ENROLLED:
show “Some selected users are not enrolled and were skipped.”
If errors include EMAIL_NOT_CONFIGURED / EMAIL_FAILED / EMAIL_MISSING:
show failure counts and keep the detailed list collapsible.

8. API Integration Summary
A) Load View Data (Required)
GET survey_dispatch_view/{postingId}
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

9. Validation Rules (UI)
Before dispatch call:
Must select at least 1 survey
Must select at least 1 participant
Must block if pairs count exceeds your documented cap (if enforced by backend)
show “Too many selections. Reduce users or surveys.”
After view load:
If response.posting_id mismatches studyId (if included), block and show error.

10. Empty / Edge States
No surveys exist
Show message: “No surveys created yet.”
Show “Create Survey” button
No participants enrolled
Show message: “No enrolled participants found for this study.”
Still show surveys panel (surveys can exist even if participants are 0)
Grid has no cells (nothing selected)
Show helper text: “Select surveys and participants to see the status grid.”

11. Performance Requirements
Pagination must apply to participants; never attempt to load all participants at once.
Grid must render only current page participants.
Debounce search input (client-side) to avoid re-render storms.
Avoid rendering full recipient_status list if large; normalize to a lookup map keyed by (survey_id, user_id).

12. Audit and Logging Requirements
Log:
page open (studyId)
view page changes (page/page_size)
dispatch attempt (counts only: surveys_selected, participants_selected, pairs_requested, mode, dry_run)
dispatch result summary (counts only)
Never log:
recipient tokens
full user_id lists

13. Responsiveness Requirements
On small screens:
Surveys panel collapsible accordion
Participants list as cards
Grid as horizontally scrollable table or “selected survey -> list statuses” toggle view

Survey Email Content Specification
1) Purpose
This section defines:
The expected structure of survey invitation emails
The expected structure of reminder/resend emails
Required elements in all survey-related emails
Security and formatting constraints
This section is independent of the API implementation.

2) General Email Requirements
All survey emails must:
Address the participant by name (if available)
Identify the researcher sending the survey
Clearly state the survey title
Clearly reference the study (if available)
Contain exactly one secure survey link:
https://<APP_BASE_URL>/survey_redirect/{recipient_token}


Not expose:
user_id
survey_id
posting_id
participant pseudonym
recipient_token raw value
Not include tracking pixels (MVP)
Not contain multiple conflicting links

3) Template: SURVEY_INVITE (Initial Send)
Subject Format
{{study_title}} – {{survey_title}}

If study_title is not available:
Study {{study_id}} – {{survey_title}}


Plain Text Body (Example)
Hi {{participant_name}},

{{researcher_name}} has invited you to complete the survey:

"{{survey_title}}"

This survey is part of:
{{study_title}}

Please use the link below to begin:

{{survey_link}}

Your participation is appreciated.

Thank you,
{{researcher_name}}


HTML Body (Optional Example)
Greeting with participant name
Survey title highlighted
One primary call-to-action button:
“Start Survey”
Fallback raw link displayed below
No additional hyperlinks allowed.

4) Template: SURVEY_REMINDER (Resend)
Subject Format
Reminder: {{survey_title}}


Plain Text Body (Example)
Hi {{participant_name}},

This is a reminder from {{researcher_name}} regarding:

"{{survey_title}}"

If you have not yet completed the survey, you may access it here:

{{survey_link}}

If you have already completed it, please disregard this message.

Thank you,
{{researcher_name}}


5) Required Template Variables
The following placeholders must be supported:
{{participant_name}}
{{researcher_name}}
{{survey_title}}
{{study_title}}
{{study_id}}
{{survey_link}}
If participant_name is missing:
Replace with "Participant"

6) Link Construction Rule
The survey link must always be generated server-side:
survey_link = APP_BASE_URL + "/survey_redirect/" + recipient_token

Client must never construct this link.

7) Compliance / Safety Notes
Emails must not contain any health data.
Emails must not contain internal system identifiers.
Emails must not log full recipient tokens.
All token validation must occur in survey_redirect.


