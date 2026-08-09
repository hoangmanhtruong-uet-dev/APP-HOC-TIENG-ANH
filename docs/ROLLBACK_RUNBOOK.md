# Private production rollback runbook

## 1. Principles

- Roll back the Vercel application artifact first when the database remains healthy.
- Never run a destructive down migration or `db reset --linked`.
- Database incidents use a reviewed forward-fix migration or an isolated restore.
- Keep Vercel deployment protection enabled throughout rollback.
- Preserve evidence; never copy secrets into tickets or screenshots.

## 2. Required pre-release record

The release ticket must contain:

- New and previous commit SHA.
- New and previous immutable Vercel deployment ID/URL.
- Vercel environment configuration version/change reference, with values hidden.
- Production Supabase project ref and migration versions.
- Latest verified recovery point.
- Scheduler state and credential version reference.
- Release owner and rollback operator.

If the previous artifact cannot be identified and opened privately, release is `NO-GO`.

## 3. Rollback triggers

Rollback or stop traffic on any of these conditions:

- `/api/health/ready` is not 200 after the agreed warm-up window.
- Auth confirmation/login or owner isolation fails.
- Cross-user, draft, answer-key, transcript, essay or private-audio exposure.
- Elevated 5xx/error rate, broken critical submit flow or corrupted results.
- Cleanup deletes an unexpected object or cannot finalize metadata safely.
- Migration/verifier mismatch.

Security/data-exposure findings are P0: close access first, then investigate.

## 4. Vercel application rollback

1. Keep private access protection enabled and pause any traffic expansion.
2. In Vercel, select the recorded previous immutable deployment and use the platform's rollback/promote mechanism.
3. Restore the compatible prior environment configuration reference if the release changed env names/values.
4. Verify `/live`, `/ready`, Auth redirects and one owner-scoped read.
5. Record deployment IDs, timestamps, operator and reason.

Do not rebuild an approximation of the old commit when an immutable artifact exists.

## 5. Environment/secret rollback

- Public configuration error: restore the prior Vercel env version and redeploy the prior artifact.
- Suspected secret exposure: rotate; never restore the compromised secret.
- Signing secret: rotate Vercel and Supabase Vault copies together.
- Cleanup secret: pause scheduler, rotate app and scheduler atomically, then perform an authorized test.

## 6. Database incident

1. Stop writes/private access and pause scheduler/provider work.
2. Capture migration history, error timestamps and affected identifiers without sensitive payloads.
3. If schema is intact, create a new forward-fix migration, review, dry-run and apply.
4. If data may be corrupt, restore the selected recovery point into a new isolated Supabase project.
5. Run migration parity, DB lint, remote verifier, RLS and application smoke on the isolated restore.
6. Cut over only with explicit release/data-owner approval.

Never drop columns/functions/policies as an emergency down migration on the production project.

## 7. Auth, Storage and scheduler rollback

- Auth lockout: close signup, restore the recorded Auth configuration and test with a dedicated account.
- Storage exposure: disable uploads/access, rotate affected credentials/signed URLs and apply a forward policy fix.
- Cleanup problem: pause scheduler immediately; do not run manual mass deletion. Preserve lease/status evidence for recovery.

## 8. Rehearsal and evidence

Before GO, rehearse on a protected non-production deployment:

- Promote a new artifact, then restore the previous artifact.
- Confirm compatible env restoration.
- Confirm `/ready` and critical smoke after rollback.
- Walk through a forward-fix migration without applying destructive SQL.
- Restore a backup into an isolated project and measure RTO.

Store screenshots/run IDs and achieved timing. The readiness control remains `UNKNOWN` until the rehearsal is completed.
