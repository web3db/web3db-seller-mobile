-- =============================================================================
-- Survey Feature — DDL for new tables
-- Run against the Supabase database AFTER existing TRN_Survey / TRN_SurveyRecipient.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TRN_SurveyMessageEvent
--    One row per "send" action (bulk send-to-all, dispatch, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TRN_SurveyMessageEvent" (
    "SurveyMessageEventId"  BIGSERIAL       PRIMARY KEY,
    "PostingId"             BIGINT          NOT NULL,
    "SurveyId"              BIGINT          NULL,          -- NULL when event spans multiple surveys
    "EventSource"           VARCHAR(50)     NOT NULL       -- 'SEND_TO_ALL', 'DISPATCH', 'MANUAL'
                            CHECK ("EventSource" IN ('SEND_TO_ALL','DISPATCH','MANUAL')),
    "DispatchMode"          VARCHAR(30)     NULL           -- 'SEND_MISSING','RESEND_EXISTING','SEND_AND_RESEND'
                            CHECK ("DispatchMode" IS NULL OR "DispatchMode" IN ('SEND_MISSING','RESEND_EXISTING','SEND_AND_RESEND')),
    "IncludeLink"           BOOLEAN         NOT NULL DEFAULT TRUE,
    "IncludeMessage"        BOOLEAN         NOT NULL DEFAULT FALSE,
    -- NOTE: Application-level encryption should be applied before storage when include_message is true.
    -- The Edge Function is responsible for encrypting/decrypting this field.
    "MessageText"           TEXT            NULL,
    "DryRun"                BOOLEAN         NOT NULL DEFAULT FALSE,
    "InitiatedBy"           BIGINT          NOT NULL,      -- FK to USR_User
    "PairsSent"             INT             NOT NULL DEFAULT 0,
    "PairsFailed"           INT             NOT NULL DEFAULT 0,
    "PairsSkipped"          INT             NOT NULL DEFAULT 0,
    "CreatedOn"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "ModifiedOn"            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_SurveyMessageEvent_Posting"
        FOREIGN KEY ("PostingId") REFERENCES "TRN_Posting"("PostingId"),
    CONSTRAINT "FK_SurveyMessageEvent_Survey"
        FOREIGN KEY ("SurveyId") REFERENCES "TRN_Survey"("SurveyId")
);

CREATE INDEX IF NOT EXISTS "IX_SurveyMessageEvent_PostingId"
    ON "TRN_SurveyMessageEvent" ("PostingId");
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageEvent_SurveyId"
    ON "TRN_SurveyMessageEvent" ("SurveyId");

ALTER TABLE "TRN_SurveyMessageEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "TRN_SurveyMessageEvent"
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anon no access" ON "TRN_SurveyMessageEvent"
    FOR ALL USING (false);

-- ---------------------------------------------------------------------------
-- 2. TRN_SurveyMessageRecipient
--    One row per recipient per message event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TRN_SurveyMessageRecipient" (
    "SurveyMessageRecipientId"  BIGSERIAL       PRIMARY KEY,
    "SurveyMessageEventId"      BIGINT          NOT NULL,
    "SurveyRecipientId"         BIGINT          NOT NULL,      -- FK to TRN_SurveyRecipient
    "UserId"                    BIGINT          NOT NULL,
    "SurveyId"                  BIGINT          NOT NULL,
    "OutcomeStatus"             VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                CHECK ("OutcomeStatus" IN ('PENDING','SENT','FAILED','SKIPPED')),
    "SkipReason"                VARCHAR(100)    NULL,
    "FailureCode"               VARCHAR(100)    NULL,
    "AttemptedOn"               TIMESTAMPTZ     NULL,
    "CompletedOn"               TIMESTAMPTZ     NULL,
    "CreatedOn"                 TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "ModifiedOn"                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_SurveyMessageRecipient_Event"
        FOREIGN KEY ("SurveyMessageEventId") REFERENCES "TRN_SurveyMessageEvent"("SurveyMessageEventId"),
    CONSTRAINT "FK_SurveyMessageRecipient_Recipient"
        FOREIGN KEY ("SurveyRecipientId") REFERENCES "TRN_SurveyRecipient"("SurveyRecipientId"),
    CONSTRAINT "FK_SurveyMessageRecipient_Survey"
        FOREIGN KEY ("SurveyId") REFERENCES "TRN_Survey"("SurveyId")
);

CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_EventId"
    ON "TRN_SurveyMessageRecipient" ("SurveyMessageEventId");
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_UserId"
    ON "TRN_SurveyMessageRecipient" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_SurveyId"
    ON "TRN_SurveyMessageRecipient" ("SurveyId");

ALTER TABLE "TRN_SurveyMessageRecipient" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "TRN_SurveyMessageRecipient"
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anon no access" ON "TRN_SurveyMessageRecipient"
    FOR ALL USING (false);

-- ---------------------------------------------------------------------------
-- 3. MST_EmailTemplate
--    Stores email templates (INVITE, REMINDER, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MST_EmailTemplate" (
    "EmailTemplateId"   SERIAL          PRIMARY KEY,
    "Code"              VARCHAR(50)     NOT NULL UNIQUE,   -- 'SURVEY_INVITE', 'SURVEY_REMINDER'
    "DisplayName"       VARCHAR(200)    NOT NULL,
    "SubjectTemplate"   TEXT            NOT NULL,          -- supports {{placeholders}}
    "BodyTemplate"      TEXT            NOT NULL,          -- supports {{placeholders}}
    "IsActive"          BOOLEAN         NOT NULL DEFAULT TRUE,
    "CreatedOn"         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "ModifiedOn"        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Seed default templates
INSERT INTO "MST_EmailTemplate" ("Code", "DisplayName", "SubjectTemplate", "BodyTemplate")
VALUES
    ('SURVEY_INVITE',   'Survey Invitation',
     'You have been invited to complete a survey: {{survey_title}}',
     E'Hello,\n\nYou have been invited to participate in the survey "{{survey_title}}" for the study "{{study_title}}".\n\n{{#if include_link}}Please click the link below to begin:\n{{survey_link}}\n\n{{/if}}{{#if include_message}}Message from the researcher:\n{{message_text}}\n\n{{/if}}Thank you for your participation.'),
    ('SURVEY_REMINDER',  'Survey Reminder',
     'Reminder: Please complete the survey — {{survey_title}}',
     E'Hello,\n\nThis is a friendly reminder to complete the survey "{{survey_title}}" for the study "{{study_title}}".\n\n{{#if include_link}}You can access the survey here:\n{{survey_link}}\n\n{{/if}}{{#if include_message}}Message from the researcher:\n{{message_text}}\n\n{{/if}}Thank you.')
ON CONFLICT ("Code") DO NOTHING;

ALTER TABLE "MST_EmailTemplate" ENABLE ROW LEVEL SECURITY;

-- Templates readable by anon (for preview), writable only by service role
CREATE POLICY "Service role full access" ON "MST_EmailTemplate"
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anon read only" ON "MST_EmailTemplate"
    FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 4. TRN_EmailDeliveryLog
--    Audit log for every email delivery attempt
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TRN_EmailDeliveryLog" (
    "EmailDeliveryLogId"    BIGSERIAL       PRIMARY KEY,
    "SurveyMessageEventId"  BIGINT          NULL,
    -- PII: Contains recipient email addresses. Access restricted by RLS policies.
    -- Consider application-level encryption for additional protection.
    "RecipientEmail"        VARCHAR(320)    NOT NULL,
    "TemplateCode"          VARCHAR(50)     NOT NULL,
    "Status"                VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                            CHECK ("Status" IN ('PENDING','SENT','FAILED','BOUNCED')),
    "ProviderMessageId"     VARCHAR(200)    NULL,          -- e.g. SendGrid/SES message ID
    "ErrorMessage"          TEXT            NULL,
    "AttemptedOn"           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "CompletedOn"           TIMESTAMPTZ     NULL,
    "CreatedOn"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_EmailDeliveryLog_Event"
        FOREIGN KEY ("SurveyMessageEventId") REFERENCES "TRN_SurveyMessageEvent"("SurveyMessageEventId")
);

CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_EventId"
    ON "TRN_EmailDeliveryLog" ("SurveyMessageEventId");
CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_Status"
    ON "TRN_EmailDeliveryLog" ("Status");

ALTER TABLE "TRN_EmailDeliveryLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "TRN_EmailDeliveryLog"
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anon no access" ON "TRN_EmailDeliveryLog"
    FOR ALL USING (false);

-- ---------------------------------------------------------------------------
-- Performance indexes for common query patterns
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_Email"
    ON "TRN_EmailDeliveryLog" ("RecipientEmail");

CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_OutcomeStatus"
    ON "TRN_SurveyMessageRecipient" ("OutcomeStatus");

-- ---------------------------------------------------------------------------
-- 5. Triggers: survey_set_modified_on (namespaced to avoid conflicts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION survey_set_modified_on()
RETURNS TRIGGER AS $$
BEGIN
    NEW."ModifiedOn" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_survey_message_event_modified') THEN
        CREATE TRIGGER trg_survey_message_event_modified
            BEFORE UPDATE ON "TRN_SurveyMessageEvent"
            FOR EACH ROW EXECUTE FUNCTION survey_set_modified_on();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_survey_message_recipient_modified') THEN
        CREATE TRIGGER trg_survey_message_recipient_modified
            BEFORE UPDATE ON "TRN_SurveyMessageRecipient"
            FOR EACH ROW EXECUTE FUNCTION survey_set_modified_on();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_email_template_modified') THEN
        CREATE TRIGGER trg_email_template_modified
            BEFORE UPDATE ON "MST_EmailTemplate"
            FOR EACH ROW EXECUTE FUNCTION survey_set_modified_on();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. ALTER existing TRN_Survey columns if they use old Google-specific names
--    Uncomment if your database has GoogleFormResponderUrl / PrefillEntryKey:
-- ---------------------------------------------------------------------------
-- ALTER TABLE "TRN_Survey" RENAME COLUMN "GoogleFormResponderUrl" TO "FormResponderUrl";
-- ALTER TABLE "TRN_Survey" RENAME COLUMN "PrefillEntryKey" TO "ParticipantParamKey";
