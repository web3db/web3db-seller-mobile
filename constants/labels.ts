/**
 * User-facing role labels used across the app.
 * Update here to change them everywhere at once.
 *
 * Note: dynamic labels from auth/session are not possible yet because the
 * current AuthContext does not store a user role. If a role field is added
 * to the user model in future, these can be replaced with a hook that reads
 * from auth context.
 */
export const LABELS = {
  CONTRIBUTOR: "Research Participant",
  CONTRIBUTOR_PLURAL: "Research Participants",
  INSTITUTIONAL_PARTNER: "Clinical Researcher",
  INSTITUTIONAL_PARTNER_PLURAL: "Clinical Researchers",
} as const;
