# Data subject request (DSR) runbook

## 1. Status and scope

This is the manual private-production workflow for access, correction, export and deletion requests. It does not create an in-app account-management feature.

The DSR readiness control remains `FAIL` until all of the following exist:

- A real `NEXT_PUBLIC_SUPPORT_EMAIL` mailbox.
- A named privacy operator and backup operator.
- An access-controlled ticket system.
- A completed export/delete tabletop on a non-production user.
- A reviewed ordered-deletion procedure for the current foreign-key graph and private Storage objects.

## 2. Intake and ticket

Create one restricted ticket per request. Record:

- Ticket ID and received timestamp.
- Request type: access, correction, export or deletion.
- Account email and Supabase user UUID after verification.
- Identity-verification method and verifier.
- Data scope, legal/contractual hold decision and approval.
- Execution timestamps, operator IDs, evidence hashes/locations and outcome.
- User notification timestamp.

Never place passwords, access tokens, service-role keys, signed URLs, raw audio or full essays/transcripts in the ticket.

Internal operating target: acknowledge within three business days, then complete within the applicable legal/contractual deadline confirmed by the operator. This is an operational target, not legal advice.

## 3. Identity verification

Use at least one account-bound proof:

1. Request originates from the registered email and completes a fresh confirmation link; or
2. The signed-in user supplies the ticket ID through an authenticated support flow approved by the operator.

Never ask for the user's password, OTP, session cookie or recovery code. Escalate mismatched or compromised-account requests instead of processing them.

## 4. Data inventory

The export/deletion scope includes, at minimum:

- Supabase Auth identity and `profiles`/`learner_profiles`.
- Lesson/section progress.
- Exercise, Reading and Listening attempts/answers.
- Writing submissions and feedback records.
- Speaking attempts, responses, upload intents, private audio, transcripts and feedback.
- Mock-test sessions, sections and results.

Content catalog/answer keys are application content and are not exported as user-owned data except where required to make the user's records understandable.

## 5. Access/export procedure

1. Verify identity and hold status.
2. Use database-owner or a dedicated server-side administrative process; never expose service-role access to a browser.
3. Query by the verified user UUID, not by client-supplied UUID alone.
4. Export only the user's rows and necessary human-readable context.
5. Store the export temporarily in an access-controlled location with an expiry.
6. Review the export for other users' data, secrets, answer keys and signed URLs.
7. Deliver through an approved authenticated/encrypted channel.
8. Record delivery and expiry in the ticket, then remove the temporary export under retention policy.

## 6. Correction procedure

For editable profile/preferences, use the normal authenticated application flow where possible. For immutable submitted attempts/content snapshots, append a correction note or apply an approved data-repair procedure; do not rewrite historical scoring/content without a reviewed decision.

## 7. Deletion procedure

Deletion is high risk because several Speaking/Writing/Mock relationships use restrictive foreign keys. Deleting only `auth.users` is not accepted evidence that all data and Storage objects were removed.

1. Verify identity, authorization, backup and legal-hold decision.
2. Suspend further account processing and AI/cleanup work for the target user where operationally possible.
3. Generate a dry-run inventory with row counts and private Storage paths.
4. Delete private Storage objects first and verify removal; do not put signed URLs in evidence.
5. In one reviewed database transaction, delete dependent user rows in foreign-key-safe order, then the profile/Auth identity last.
6. Roll back the transaction if any expected count/invariant fails.
7. Verify zero remaining owner rows, no private objects and no active sessions.
8. Record only counts, timestamps and identifiers required for the audit ticket.
9. Notify the requester after verification.

Before production use, the exact ordered SQL/admin procedure must be rehearsed against an isolated non-production user containing data in every engine. Do not improvise deletion SQL against production.

## 8. Failure and rollback

- Before commit: roll back the transaction and leave the ticket open.
- Storage removed but DB transaction failed: stop, preserve evidence, use the approved recovery path and do not mark the request complete.
- Incorrect-user scope or cross-user data in export: revoke the export, treat as a security incident and notify the incident owner.
- After verified deletion: do not silently restore the account into production. Any recovery is an incident/legal decision using an isolated restore first.

## 9. Evidence needed to pass readiness

- Screenshot showing the real support mailbox and assigned operators.
- Redacted sample ticket/tabletop.
- Export review showing no cross-user data/secrets.
- Deletion rehearsal counts for all user-owned tables and Storage.
- Operator approval and achieved completion time.
