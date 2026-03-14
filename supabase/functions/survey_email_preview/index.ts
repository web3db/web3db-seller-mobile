import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, enforceMethod } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';
import { loadTemplate, renderTemplate } from '../_shared/email.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'POST');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);

    const body = await req.json().catch(() => ({}));
    const {
      template_key = 'SURVEY_INVITE',
      survey_title = 'Example Survey',
      study_title = 'Example Study',
      include_survey_link = true,
      include_message = false,
      message_text = '',
    } = body;

    // Support old field names for backward compat
    const includeSurveyLink = include_survey_link ?? body.include_link ?? true;
    const templateKey = template_key ?? body.template_code ?? 'SURVEY_INVITE';

    // Validate template_key
    const validKeys = ['SURVEY_INVITE', 'SURVEY_REMINDER', 'SURVEY_CUSTOM'];
    if (!validKeys.includes(templateKey)) {
      return errorResponse('VALIDATION_ERROR', `template_key must be one of: ${validKeys.join(', ')}`, 400);
    }

    // Validate input lengths to prevent resource exhaustion
    const MAX_TITLE_LEN = 500;
    const MAX_MESSAGE_LEN = 10000;
    if (typeof survey_title === 'string' && survey_title.length > MAX_TITLE_LEN) {
      return errorResponse('VALIDATION_ERROR', `survey_title must be ${MAX_TITLE_LEN} characters or fewer`, 400);
    }
    if (typeof study_title === 'string' && study_title.length > MAX_TITLE_LEN) {
      return errorResponse('VALIDATION_ERROR', `study_title must be ${MAX_TITLE_LEN} characters or fewer`, 400);
    }
    if (typeof message_text === 'string' && message_text.length > MAX_MESSAGE_LEN) {
      return errorResponse('VALIDATION_ERROR', `message_text must be ${MAX_MESSAGE_LEN} characters or fewer`, 400);
    }

    // Verify posting ownership if posting_id provided
    if (body.posting_id) {
      const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', body.posting_id).single();
      if (!posting || posting.BuyerUserId !== user.internalUserId) {
        return errorResponse('FORBIDDEN', 'You do not have permission for this posting', 403);
      }
    }

    // Use the actual form URL for a realistic preview
    let previewSurveyLink = 'https://example.com/survey/SAMPLE-TOKEN';
    if (body.form_url) {
      // Validate form_url is HTTPS and from an allowed domain to prevent phishing
      try {
        const parsed = new URL(body.form_url);
        if (parsed.protocol !== 'https:') {
          return errorResponse('VALIDATION_ERROR', 'form_url must use HTTPS', 400);
        }
        const ALLOWED_FORM_DOMAINS = ['docs.google.com', 'forms.gle', 'forms.google.com', 'surveymonkey.com', 'qualtrics.com', 'typeform.com'];
        if (!ALLOWED_FORM_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
          return errorResponse('VALIDATION_ERROR', 'form_url domain is not allowed', 400);
        }
      } catch {
        return errorResponse('VALIDATION_ERROR', 'form_url must be a valid URL', 400);
      }
      previewSurveyLink = `${body.form_url}${body.form_url.includes('?') ? '&' : '?'}participant=p_SAMPLE_ID`;
    } else if (body.survey_id) {
      const surveyId = Number(body.survey_id);
      if (!Number.isSafeInteger(surveyId) || surveyId <= 0) {
        return errorResponse('VALIDATION_ERROR', 'survey_id must be a positive integer', 400);
      }
      // Verify survey ownership via its posting
      const { data: surveyRow } = await sb
        .from('TRN_Survey')
        .select('FormResponderUrl, PostingId')
        .eq('SurveyId', surveyId)
        .single();
      if (surveyRow) {
        // Check ownership of the survey's posting
        const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', surveyRow.PostingId).single();
        if (!posting || posting.BuyerUserId !== user.internalUserId) {
          return errorResponse('FORBIDDEN', 'You do not have permission for this survey', 403);
        }
        if (surveyRow.FormResponderUrl) {
          previewSurveyLink = `${surveyRow.FormResponderUrl}${surveyRow.FormResponderUrl.includes('?') ? '&' : '?'}participant=p_SAMPLE_ID`;
        }
      }
    }

    // Fetch template using shared helper
    const template = await loadTemplate(sb, templateKey);

    const placeholders: Record<string, string> = {
      survey_title,
      study_title,
      survey_link: previewSurveyLink,
      participant_id: 'p_SAMPLE_ID',
      include_link: String(includeSurveyLink),
      include_message: String(include_message),
      message_text: message_text || '(no message)',
    };

    if (!template) {
      // Use renderTemplate with an inline default template to ensure proper escaping
      const defaultTemplate = {
        SubjectTemplate: 'You have been invited to complete a survey: {{survey_title}}',
        BodyTemplate: [
          'Hello,',
          '',
          'You have been invited to participate in the survey "{{survey_title}}" for the study "{{study_title}}".',
          '',
          '{{#if include_link}}Please click the link below to begin:\n{{survey_link}}\n{{/if}}',
          '{{#if include_message}}Message from the researcher:\n{{message_text}}\n{{/if}}',
          'Thank you for your participation.',
        ].join('\n'),
      };
      const rendered = renderTemplate(defaultTemplate, placeholders);

      return jsonResponse({
        ok: true,
        subject: rendered.subject,
        body_html: rendered.body_html,
        placeholders_used: rendered.placeholders_used,
      });
    }

    // Render template with shared helper
    const rendered = renderTemplate(template, placeholders);

    return jsonResponse({
      ok: true,
      subject: rendered.subject,
      body_html: rendered.body_html,
      placeholders_used: rendered.placeholders_used,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_email_preview error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
