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