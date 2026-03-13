import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, enforceMethod } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'POST');
  if (methodErr) return methodErr;

  try {
    const user = await verifyAuth(req);

    const body = await req.json().catch(() => ({}));
    const {
      template_code = 'SURVEY_INVITE',
      survey_title = 'Example Survey',
      study_title = 'Example Study',
      include_link = true,
      include_message = false,
      message_text = '',
    } = body;

    const sb = createServiceClient();

    // Verify posting ownership if posting_id provided
    if (body.posting_id) {
      const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', body.posting_id).single();
      if (!posting || posting.BuyerUserId !== user.internalUserId) {
        return errorResponse('FORBIDDEN', 'You do not have permission for this posting', 403);
      }
    }

    // Fetch template
    const { data: template, error } = await sb
      .from('MST_EmailTemplate')
      .select('*')
      .eq('Code', template_code)
      .eq('IsActive', true)
      .single();

    if (error || !template) {
      // Use inline defaults if template not found
      const defaultSubject = `You have been invited to complete a survey: ${survey_title}`;
      const defaultBody = [
        'Hello,',
        '',
        `You have been invited to participate in the survey "${survey_title}" for the study "${study_title}".`,
        '',
        include_link ? 'Please click the link below to begin:\nhttps://example.com/survey/SAMPLE-TOKEN\n' : '',
        include_message && message_text ? `Message from the researcher:\n${message_text}\n` : '',
        'Thank you for your participation.',
      ].filter(Boolean).join('\n');

      return jsonResponse({
        ok: true,
        rendered_subject: defaultSubject,
        rendered_body: defaultBody,
        placeholders: {
          survey_title,
          study_title,
          survey_link: 'https://example.com/survey/SAMPLE-TOKEN',
          participant_id: 'P-000001',
          include_link: String(include_link),
          include_message: String(include_message),
          message_text: message_text || '(no message)',
        },
      });
    }

    // Render template with placeholders
    const placeholders: Record<string, string> = {
      survey_title,
      study_title,
      survey_link: 'https://example.com/survey/SAMPLE-TOKEN',
      participant_id: 'P-000001',
      message_text: message_text || '(no message)',
    };

    let renderedSubject = template.SubjectTemplate;
    let renderedBody = template.BodyTemplate;

    // Simple placeholder replacement
    for (const [key, value] of Object.entries(placeholders)) {
      renderedSubject = renderedSubject.replaceAll(`{{${key}}}`, value);
      renderedBody = renderedBody.replaceAll(`{{${key}}}`, value);
    }

    // Handle conditional blocks
    renderedBody = renderedBody.replace(
      /\{\{#if include_link\}\}([\s\S]*?)\{\{\/if\}\}/g,
      include_link ? '$1' : ''
    );
    renderedBody = renderedBody.replace(
      /\{\{#if include_message\}\}([\s\S]*?)\{\{\/if\}\}/g,
      include_message ? '$1' : ''
    );

    return jsonResponse({
      ok: true,
      rendered_subject: renderedSubject,
      rendered_body: renderedBody,
      placeholders,
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_email_preview error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
