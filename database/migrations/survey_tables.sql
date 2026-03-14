-- =============================================================================
-- Survey Feature — DDL for new tables
-- Run against the Supabase database AFTER existing TRN_Survey / TRN_SurveyRecipient.
-- =============================================================================
-- Structure:
--   (A) Fresh install — CREATE TABLE IF NOT EXISTS with spec-compliant columns
--   (B) Upgrade path  — ALTER TABLE for migrating from old column names/values
-- =============================================================================

-- =========================================================================
-- (A) FRESH INSTALL — CREATE TABLES
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1. TRN_SurveyMessageEvent
--    One row per "send" action (bulk send-to-all, dispatch, custom message)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TRN_SurveyMessageEvent" (
    "MessageEventId"        BIGSERIAL       PRIMARY KEY,
    "PostingId"             BIGINT          NOT NULL,
    "SurveyId"              BIGINT          NULL,          -- NULL when event spans multiple surveys
    "EventSource"           VARCHAR(50)     NOT NULL       -- 'SURVEY_SEND', 'DISPATCH_CENTER', 'CUSTOM_MESSAGE'
                            CHECK ("EventSource" IN ('SURVEY_SEND','DISPATCH_CENTER','CUSTOM_MESSAGE')),
    "DispatchMode"          VARCHAR(30)     NULL           -- 'SEND_MISSING','RESEND_EXISTING','SEND_AND_RESEND'
                            CHECK ("DispatchMode" IS NULL OR "DispatchMode" IN ('SEND_MISSING','RESEND_EXISTING','SEND_AND_RESEND')),
    "IncludeSurveyLink"     BOOLEAN         NOT NULL DEFAULT TRUE,
    "IncludeMessage"        BOOLEAN         NOT NULL DEFAULT FALSE,
    "MessageCiphertext"     TEXT            NULL,
    "MessageNonce"          TEXT            NULL,
    "MessageKeyVersion"     INT             DEFAULT 1,
    "IsDryRun"              BOOLEAN         NOT NULL DEFAULT FALSE,
    "CreatedBy"             BIGINT          NOT NULL,      -- FK to MST_User
    "TotalRecipients"       INT             NOT NULL DEFAULT 0,
    "TotalSent"             INT             NOT NULL DEFAULT 0,
    "TotalFailed"           INT             NOT NULL DEFAULT 0,
    "TotalSkipped"          INT             NOT NULL DEFAULT 0,
    "TargetingSummary"      JSONB           NULL,
    "Channel"               VARCHAR(20)     NOT NULL DEFAULT 'EMAIL'
                            CHECK ("Channel" IN ('EMAIL','IN_APP','SMS')),
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'TRN_SurveyMessageEvent') THEN
        CREATE POLICY "Service role full access" ON "TRN_SurveyMessageEvent"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon no access' AND tablename = 'TRN_SurveyMessageEvent') THEN
        CREATE POLICY "Anon no access" ON "TRN_SurveyMessageEvent"
            FOR ALL USING (false);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TRN_SurveyMessageRecipient
--    One row per recipient per message event (including skipped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TRN_SurveyMessageRecipient" (
    "MessageRecipientId"    BIGSERIAL       PRIMARY KEY,
    "MessageEventId"        BIGINT          NOT NULL,
    "SurveyRecipientId"     BIGINT          NULL,          -- NULL for skipped recipients
    "UserId"                BIGINT          NOT NULL,
    "SurveyId"              BIGINT          NOT NULL,
    "PostingId"             BIGINT          NOT NULL,
    "OutcomeStatus"         VARCHAR(30)     NOT NULL DEFAULT 'SENT'
                            CHECK ("OutcomeStatus" IN ('SENT','FAILED','SKIPPED_NOT_ENROLLED','SKIPPED_ALREADY_SENT','SKIPPED_DUE_TO_MODE')),
    "SkipReason"            VARCHAR(100)    NULL
                            CHECK ("SkipReason" IS NULL OR "SkipReason" IN ('NOT_ENROLLED','ALREADY_SENT','MODE_SEND_MISSING_ALREADY_EXISTS','MODE_RESEND_EXISTING_MISSING')),
    "FailureCode"           VARCHAR(100)    NULL,
    "Channel"               VARCHAR(20)     NOT NULL DEFAULT 'EMAIL'
                            CHECK ("Channel" IN ('EMAIL','IN_APP','SMS')),
    "EmailDeliveryLogId"    BIGINT          NULL,
    "AttemptedOn"           TIMESTAMPTZ     NULL,
    "CompletedOn"           TIMESTAMPTZ     NULL,
    "CreatedOn"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "ModifiedOn"            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_SurveyMessageRecipient_Event"
        FOREIGN KEY ("MessageEventId") REFERENCES "TRN_SurveyMessageEvent"("MessageEventId"),
    CONSTRAINT "FK_SurveyMessageRecipient_Recipient"
        FOREIGN KEY ("SurveyRecipientId") REFERENCES "TRN_SurveyRecipient"("SurveyRecipientId"),
    CONSTRAINT "FK_SurveyMessageRecipient_Survey"
        FOREIGN KEY ("SurveyId") REFERENCES "TRN_Survey"("SurveyId"),
    CONSTRAINT "FK_SurveyMessageRecipient_Posting"
        FOREIGN KEY ("PostingId") REFERENCES "TRN_Posting"("PostingId")
);

CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_EventId"
    ON "TRN_SurveyMessageRecipient" ("MessageEventId");
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_UserId"
    ON "TRN_SurveyMessageRecipient" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_SurveyId"
    ON "TRN_SurveyMessageRecipient" ("SurveyId");
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_OutcomeStatus"
    ON "TRN_SurveyMessageRecipient" ("OutcomeStatus");

ALTER TABLE "TRN_SurveyMessageRecipient" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'TRN_SurveyMessageRecipient') THEN
        CREATE POLICY "Service role full access" ON "TRN_SurveyMessageRecipient"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon no access' AND tablename = 'TRN_SurveyMessageRecipient') THEN
        CREATE POLICY "Anon no access" ON "TRN_SurveyMessageRecipient"
            FOR ALL USING (false);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. MST_EmailTemplate
--    Stores email templates (INVITE, REMINDER, CUSTOM)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MST_EmailTemplate" (
    "EmailTemplateId"   SERIAL          PRIMARY KEY,
    "TemplateKey"       VARCHAR(50)     NOT NULL UNIQUE
                        CHECK ("TemplateKey" IN ('SURVEY_INVITE','SURVEY_REMINDER','SURVEY_CUSTOM')),
    "DisplayName"       VARCHAR(200)    NOT NULL,
    "SubjectTemplate"   TEXT            NOT NULL,          -- supports {{placeholders}}
    "BodyTemplate"      TEXT            NOT NULL,          -- supports {{placeholders}}
    "Channel"           VARCHAR(20)     NOT NULL DEFAULT 'EMAIL'
                        CHECK ("Channel" IN ('EMAIL','IN_APP','SMS')),
    "Version"           INT             NOT NULL DEFAULT 1,
    "IsActive"          BOOLEAN         NOT NULL DEFAULT TRUE,
    "CreatedOn"         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "ModifiedOn"        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Seed default templates
INSERT INTO "MST_EmailTemplate" ("TemplateKey", "DisplayName", "SubjectTemplate", "BodyTemplate")
VALUES
    ('SURVEY_INVITE',   'Survey Invitation',
     'You have been invited to complete a survey: {{survey_title}}',
     E'Hello,\n\nYou have been invited to participate in the survey "{{survey_title}}" for the study "{{study_title}}".\n\n{{#if include_link}}Please click the link below to begin:\n{{survey_link}}\n\n{{/if}}{{#if include_message}}Message from the researcher:\n{{message_text}}\n\n{{/if}}Thank you for your participation.'),
    ('SURVEY_REMINDER',  'Survey Reminder',
     'Reminder: Please complete the survey — {{survey_title}}',
     E'Hello,\n\nThis is a friendly reminder to complete the survey "{{survey_title}}" for the study "{{study_title}}".\n\n{{#if include_link}}You can access the survey here:\n{{survey_link}}\n\n{{/if}}{{#if include_message}}Message from the researcher:\n{{message_text}}\n\n{{/if}}Thank you.'),
    ('SURVEY_CUSTOM',    'Custom Survey Message',
     '{{survey_title}} — Message from researcher',
     E'Hello,\n\n{{#if include_message}}{{message_text}}\n\n{{/if}}{{#if include_link}}Access the survey here:\n{{survey_link}}\n\n{{/if}}Thank you.')
ON CONFLICT ("TemplateKey") DO NOTHING;

ALTER TABLE "MST_EmailTemplate" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'MST_EmailTemplate') THEN
        CREATE POLICY "Service role full access" ON "MST_EmailTemplate"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon read only' AND tablename = 'MST_EmailTemplate') THEN
        CREATE POLICY "Anon read only" ON "MST_EmailTemplate"
            FOR SELECT USING (true);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. TRN_EmailDeliveryLog
--    Audit log for every email delivery attempt
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TRN_EmailDeliveryLog" (
    "EmailDeliveryLogId"    BIGSERIAL       PRIMARY KEY,
    "MessageEventId"        BIGINT          NULL,
    "MessageRecipientId"    BIGINT          NULL,
    -- PII: Contains recipient email addresses. Access restricted by RLS policies.
    "RecipientEmail"        VARCHAR(320)    NOT NULL,
    "TemplateKey"           VARCHAR(50)     NOT NULL,
    "Status"                VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                            CHECK ("Status" IN ('PENDING','SENT','FAILED','BOUNCED')),
    "ProviderMessageId"     VARCHAR(200)    NULL,          -- e.g. SendGrid/SES message ID or EMAIL_STUB_*
    "ErrorMessage"          TEXT            NULL,
    "AttemptedOn"           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "CompletedOn"           TIMESTAMPTZ     NULL,
    "CreatedOn"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "ModifiedOn"            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_EmailDeliveryLog_Event"
        FOREIGN KEY ("MessageEventId") REFERENCES "TRN_SurveyMessageEvent"("MessageEventId")
);

CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_EventId"
    ON "TRN_EmailDeliveryLog" ("MessageEventId");
CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_RecipientId"
    ON "TRN_EmailDeliveryLog" ("MessageRecipientId");
CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_Status"
    ON "TRN_EmailDeliveryLog" ("Status");

ALTER TABLE "TRN_EmailDeliveryLog" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'TRN_EmailDeliveryLog') THEN
        CREATE POLICY "Service role full access" ON "TRN_EmailDeliveryLog"
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anon no access' AND tablename = 'TRN_EmailDeliveryLog') THEN
        CREATE POLICY "Anon no access" ON "TRN_EmailDeliveryLog"
            FOR ALL USING (false);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Index on RecipientToken for fast redirect lookups
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SurveyRecipient_Token"
    ON "TRN_SurveyRecipient" ("RecipientToken");

-- ---------------------------------------------------------------------------
-- 6. Triggers: survey_set_modified_on (namespaced to avoid conflicts)
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_email_delivery_log_modified') THEN
        CREATE TRIGGER trg_email_delivery_log_modified
            BEFORE UPDATE ON "TRN_EmailDeliveryLog"
            FOR EACH ROW EXECUTE FUNCTION survey_set_modified_on();
    END IF;
END $$;

-- =========================================================================
-- (B) UPGRADE PATH — Migrate from old column names/values
-- =========================================================================
-- Run these statements if upgrading from the original DDL.
-- They are safe to run on a fresh install (they will no-op if columns don't exist).

-- 2.1 TRN_SurveyMessageEvent column renames
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'SurveyMessageEventId') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "SurveyMessageEventId" TO "MessageEventId";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'InitiatedBy') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "InitiatedBy" TO "CreatedBy";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'IncludeLink') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "IncludeLink" TO "IncludeSurveyLink";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'DryRun') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "DryRun" TO "IsDryRun";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'PairsSent') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "PairsSent" TO "TotalSent";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'PairsFailed') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "PairsFailed" TO "TotalFailed";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'PairsSkipped') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" RENAME COLUMN "PairsSkipped" TO "TotalSkipped";
    END IF;
END $$;

-- Add new columns if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'MessageCiphertext') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" ADD COLUMN "MessageCiphertext" TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'MessageNonce') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" ADD COLUMN "MessageNonce" TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'MessageKeyVersion') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" ADD COLUMN "MessageKeyVersion" INT DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'TotalRecipients') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" ADD COLUMN "TotalRecipients" INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'TargetingSummary') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" ADD COLUMN "TargetingSummary" JSONB NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageEvent' AND column_name = 'Channel') THEN
        ALTER TABLE "TRN_SurveyMessageEvent" ADD COLUMN "Channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL';
    END IF;
END $$;

-- Migrate EventSource values before applying new CHECK
UPDATE "TRN_SurveyMessageEvent" SET "EventSource" = 'SURVEY_SEND' WHERE "EventSource" = 'SEND_TO_ALL';
UPDATE "TRN_SurveyMessageEvent" SET "EventSource" = 'DISPATCH_CENTER' WHERE "EventSource" = 'DISPATCH';
UPDATE "TRN_SurveyMessageEvent" SET "EventSource" = 'CUSTOM_MESSAGE' WHERE "EventSource" = 'MANUAL';

-- Drop old CHECK and add new one
DO $$ BEGIN
    ALTER TABLE "TRN_SurveyMessageEvent" DROP CONSTRAINT IF EXISTS "TRN_SurveyMessageEvent_EventSource_check";
    ALTER TABLE "TRN_SurveyMessageEvent" ADD CONSTRAINT "TRN_SurveyMessageEvent_EventSource_check"
        CHECK ("EventSource" IN ('SURVEY_SEND','DISPATCH_CENTER','CUSTOM_MESSAGE'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TRN_SurveyMessageEvent" DROP CONSTRAINT IF EXISTS "TRN_SurveyMessageEvent_Channel_check";
    ALTER TABLE "TRN_SurveyMessageEvent" ADD CONSTRAINT "TRN_SurveyMessageEvent_Channel_check"
        CHECK ("Channel" IN ('EMAIL','IN_APP','SMS'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.2 TRN_SurveyMessageRecipient column renames
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageRecipient' AND column_name = 'SurveyMessageRecipientId') THEN
        ALTER TABLE "TRN_SurveyMessageRecipient" RENAME COLUMN "SurveyMessageRecipientId" TO "MessageRecipientId";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageRecipient' AND column_name = 'SurveyMessageEventId') THEN
        ALTER TABLE "TRN_SurveyMessageRecipient" RENAME COLUMN "SurveyMessageEventId" TO "MessageEventId";
    END IF;
END $$;

-- Add new columns if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageRecipient' AND column_name = 'PostingId') THEN
        ALTER TABLE "TRN_SurveyMessageRecipient" ADD COLUMN "PostingId" BIGINT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageRecipient' AND column_name = 'Channel') THEN
        ALTER TABLE "TRN_SurveyMessageRecipient" ADD COLUMN "Channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_SurveyMessageRecipient' AND column_name = 'EmailDeliveryLogId') THEN
        ALTER TABLE "TRN_SurveyMessageRecipient" ADD COLUMN "EmailDeliveryLogId" BIGINT NULL;
    END IF;
END $$;

-- Migrate OutcomeStatus values
UPDATE "TRN_SurveyMessageRecipient" SET "OutcomeStatus" = 'SKIPPED_NOT_ENROLLED' WHERE "OutcomeStatus" = 'SKIPPED';
UPDATE "TRN_SurveyMessageRecipient" SET "OutcomeStatus" = 'SENT' WHERE "OutcomeStatus" = 'PENDING';

-- Drop old CHECK and add new one for OutcomeStatus
DO $$ BEGIN
    ALTER TABLE "TRN_SurveyMessageRecipient" DROP CONSTRAINT IF EXISTS "TRN_SurveyMessageRecipient_OutcomeStatus_check";
    ALTER TABLE "TRN_SurveyMessageRecipient" ADD CONSTRAINT "TRN_SurveyMessageRecipient_OutcomeStatus_check"
        CHECK ("OutcomeStatus" IN ('SENT','FAILED','SKIPPED_NOT_ENROLLED','SKIPPED_ALREADY_SENT','SKIPPED_DUE_TO_MODE'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TRN_SurveyMessageRecipient" DROP CONSTRAINT IF EXISTS "TRN_SurveyMessageRecipient_SkipReason_check";
    ALTER TABLE "TRN_SurveyMessageRecipient" ADD CONSTRAINT "TRN_SurveyMessageRecipient_SkipReason_check"
        CHECK ("SkipReason" IS NULL OR "SkipReason" IN ('NOT_ENROLLED','ALREADY_SENT','MODE_SEND_MISSING_ALREADY_EXISTS','MODE_RESEND_EXISTING_MISSING'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TRN_SurveyMessageRecipient" DROP CONSTRAINT IF EXISTS "TRN_SurveyMessageRecipient_Channel_check";
    ALTER TABLE "TRN_SurveyMessageRecipient" ADD CONSTRAINT "TRN_SurveyMessageRecipient_Channel_check"
        CHECK ("Channel" IN ('EMAIL','IN_APP','SMS'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.3 MST_EmailTemplate — rename Code -> TemplateKey
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MST_EmailTemplate' AND column_name = 'Code') THEN
        ALTER TABLE "MST_EmailTemplate" RENAME COLUMN "Code" TO "TemplateKey";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MST_EmailTemplate' AND column_name = 'Channel') THEN
        ALTER TABLE "MST_EmailTemplate" ADD COLUMN "Channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MST_EmailTemplate' AND column_name = 'Version') THEN
        ALTER TABLE "MST_EmailTemplate" ADD COLUMN "Version" INT NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Seed SURVEY_CUSTOM if missing
INSERT INTO "MST_EmailTemplate" ("TemplateKey", "DisplayName", "SubjectTemplate", "BodyTemplate")
VALUES (
    'SURVEY_CUSTOM',
    'Custom Survey Message',
    '{{survey_title}} — Message from researcher',
    E'Hello,\n\n{{#if include_message}}{{message_text}}\n\n{{/if}}{{#if include_link}}Access the survey here:\n{{survey_link}}\n\n{{/if}}Thank you.'
)
ON CONFLICT ("TemplateKey") DO NOTHING;

-- 2.4 TRN_EmailDeliveryLog — rename SurveyMessageEventId -> MessageEventId, TemplateCode -> TemplateKey
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_EmailDeliveryLog' AND column_name = 'SurveyMessageEventId') THEN
        ALTER TABLE "TRN_EmailDeliveryLog" RENAME COLUMN "SurveyMessageEventId" TO "MessageEventId";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_EmailDeliveryLog' AND column_name = 'TemplateCode') THEN
        ALTER TABLE "TRN_EmailDeliveryLog" RENAME COLUMN "TemplateCode" TO "TemplateKey";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_EmailDeliveryLog' AND column_name = 'MessageRecipientId') THEN
        ALTER TABLE "TRN_EmailDeliveryLog" ADD COLUMN "MessageRecipientId" BIGINT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_EmailDeliveryLog' AND column_name = 'ModifiedOn') THEN
        ALTER TABLE "TRN_EmailDeliveryLog" ADD COLUMN "ModifiedOn" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Add missing index on MessageRecipientId for upgrade path
CREATE INDEX IF NOT EXISTS "IX_EmailDeliveryLog_RecipientId"
    ON "TRN_EmailDeliveryLog" ("MessageRecipientId");

-- ---------------------------------------------------------------------------
-- 7. ALTER existing TRN_Survey columns if they use old Google-specific names
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_Survey' AND column_name = 'GoogleFormResponderUrl') THEN
        ALTER TABLE "TRN_Survey" RENAME COLUMN "GoogleFormResponderUrl" TO "FormResponderUrl";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TRN_Survey' AND column_name = 'PrefillEntryKey') THEN
        ALTER TABLE "TRN_Survey" RENAME COLUMN "PrefillEntryKey" TO "ParticipantParamKey";
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Missing foreign keys
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_SurveyMessageEvent_CreatedBy' AND table_name = 'TRN_SurveyMessageEvent') THEN
        ALTER TABLE "TRN_SurveyMessageEvent"
            ADD CONSTRAINT "FK_SurveyMessageEvent_CreatedBy"
            FOREIGN KEY ("CreatedBy") REFERENCES "MST_User"("UserId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_SurveyMessageRecipient_User' AND table_name = 'TRN_SurveyMessageRecipient') THEN
        ALTER TABLE "TRN_SurveyMessageRecipient"
            ADD CONSTRAINT "FK_SurveyMessageRecipient_User"
            FOREIGN KEY ("UserId") REFERENCES "MST_User"("UserId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_EmailDeliveryLog_Recipient' AND table_name = 'TRN_EmailDeliveryLog') THEN
        ALTER TABLE "TRN_EmailDeliveryLog"
            ADD CONSTRAINT "FK_EmailDeliveryLog_Recipient"
            FOREIGN KEY ("MessageRecipientId") REFERENCES "TRN_SurveyMessageRecipient"("MessageRecipientId");
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Missing indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "IX_SurveyMessageRecipient_PostingId"
    ON "TRN_SurveyMessageRecipient" ("PostingId");

-- Unique constraint required for upsert (onConflict) in Edge Functions
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SurveyRecipient_SurveyUserId"
    ON "TRN_SurveyRecipient" ("SurveyId", "UserId");

-- ---------------------------------------------------------------------------
-- 10. Fix PostingId NULL -> NOT NULL in upgrade path
--     (Fresh install already has NOT NULL; upgrade added it as NULL)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    -- Backfill PostingId from the parent event for any NULL rows
    UPDATE "TRN_SurveyMessageRecipient" r
    SET "PostingId" = e."PostingId"
    FROM "TRN_SurveyMessageEvent" e
    WHERE r."MessageEventId" = e."MessageEventId"
      AND r."PostingId" IS NULL;

    -- Now enforce NOT NULL (safe because all rows are backfilled)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'TRN_SurveyMessageRecipient'
          AND column_name = 'PostingId'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "TRN_SurveyMessageRecipient" ALTER COLUMN "PostingId" SET NOT NULL;
    END IF;
END $$;
