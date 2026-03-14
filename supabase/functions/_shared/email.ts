// Email template loading, rendering, and (stub) sending for survey messages

export interface EmailTemplate {
  EmailTemplateId: number;
  TemplateKey: string;
  DisplayName: string;
  SubjectTemplate: string;
  BodyTemplate: string;
  IsActive: boolean;
}

export async function loadTemplate(sb: any, templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await sb
    .from('MST_EmailTemplate')
    .select('*')
    .eq('TemplateKey', templateKey)
    .eq('IsActive', true)
    .single();
  if (error) {
    console.error(`loadTemplate failed for "${templateKey}":`, error);
    return null;
  }
  if (!data) return null;
  return data as EmailTemplate;
}

/**
 * Load a template, throwing on failure. Use in send paths where template is required.
 * Returns null only if no template exists (allowing fallback), but throws on DB errors.
 */
export async function loadTemplateOrThrow(sb: any, templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await sb
    .from('MST_EmailTemplate')
    .select('*')
    .eq('TemplateKey', templateKey)
    .eq('IsActive', true)
    .single();
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "not found" — that's OK, everything else is a real error
    throw new Error(`Failed to load email template "${templateKey}": ${error.message}`);
  }
  if (!data) return null;
  return data as EmailTemplate;
}

/** HTML-escape a string to prevent XSS in email bodies */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip template syntax from placeholder values to prevent injection */
function sanitizePlaceholderValue(value: string): string {
  return value.replace(/\{\{/g, '').replace(/\}\}/g, '');
}

export function renderTemplate(
  template: { SubjectTemplate: string; BodyTemplate: string },
  placeholders: Record<string, string>
): { subject: string; body_html: string; placeholders_used: string[] } {
  let subject = template.SubjectTemplate;
  let body = template.BodyTemplate;
  const used: string[] = [];

  // Process conditionals FIRST (before value substitution) so they operate on the template structure
  body = body.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key, content) => {
      const val = placeholders[key];
      if (!used.includes(key)) used.push(key);
      return val && val !== 'false' ? content : '';
    }
  );

  subject = subject.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match: string, key: string, content: string) => {
      const val = placeholders[key];
      if (!used.includes(key)) used.push(key);
      return val && val !== 'false' ? content : '';
    }
  );

  // Then substitute placeholder values with sanitization
  for (const [key, rawValue] of Object.entries(placeholders)) {
    const token = `{{${key}}}`;
    if ((subject.includes(token) || body.includes(token)) && !used.includes(key)) {
      used.push(key);
    }
    // Strip template syntax to prevent injection, then HTML-escape for both subject and body
    const sanitized = sanitizePlaceholderValue(rawValue);
    subject = subject.replaceAll(token, escapeHtml(sanitized));
    body = body.replaceAll(token, escapeHtml(sanitized));
  }

  return { subject, body_html: body, placeholders_used: used };
}

function getEmailProvider(): string {
  return Deno.env.get('EMAIL_PROVIDER') ?? 'STUB';
}

export interface SendEmailOptions {
  messageEventId: number;
  messageRecipientId: number;
  recipientEmail: string;
  templateKey: string;
  subject: string;
  bodyHtml: string;
}

export async function sendEmail(
  sb: any,
  options: SendEmailOptions
): Promise<{ emailDeliveryLogId: number | null; success: boolean }> {
  const now = new Date().toISOString();

  const emailProvider = getEmailProvider();
  if (emailProvider === 'STUB') {
    // Stub: log to TRN_EmailDeliveryLog with EMAIL_STUB_* provider ID
    const { data, error } = await sb
      .from('TRN_EmailDeliveryLog')
      .insert({
        MessageEventId: options.messageEventId,
        MessageRecipientId: options.messageRecipientId,
        RecipientEmail: options.recipientEmail,
        TemplateKey: options.templateKey,
        Status: 'SENT',
        ProviderMessageId: `EMAIL_STUB_${crypto.randomUUID()}`,
        AttemptedOn: now,
        CompletedOn: now,
      })
      .select('EmailDeliveryLogId')
      .single();

    if (error) {
      console.error('sendEmail stub log failed:', error);
      return { emailDeliveryLogId: null, success: false };
    }
    return { emailDeliveryLogId: data?.EmailDeliveryLogId ?? null, success: true };
  }

  // Future: real email provider integration
  console.warn(`Unsupported EMAIL_PROVIDER: ${emailProvider}`);
  return { emailDeliveryLogId: null, success: false };
}
