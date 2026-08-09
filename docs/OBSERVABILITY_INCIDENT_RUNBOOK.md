# Observability and incident investigation runbook

## Repository capability

Server events are emitted as one-line JSON with `timestamp`, `level`, `event`, `requestId`, `route`, `stage`, safe error classification, optional run/batch IDs and redacted metadata. Sensitive field names and common inline credentials/email addresses are automatically redacted. Browser error boundaries send only a validated boundary kind and framework digest to the same-origin internal capture route; arbitrary browser stack/metadata is rejected.

The repository has no shared distributed rate-limit service. The client capture route therefore limits content length, accepts a strict two-field schema and rejects explicit cross-site browser requests, but this is not a production-grade anti-abuse quota. Add a Vercel/WAF rate rule or shared limiter and capture evidence before public traffic; do not use an in-memory serverless counter as proof.

This is repository evidence only. Vercel log retention, external aggregation, alert delivery and production incident tests remain `BLOCKED_BY_EXTERNAL_CONFIGURATION` until dashboard evidence exists.

## Operator lookup by request ID

1. Copy only the request ID shown to the user or returned in `x-request-id`.
2. In Vercel Logs, restrict to the exact deployment and time window.
3. Search the quoted JSON field, for example `"requestId":"req-..."`.
4. Follow related `runId`/`batchId` events and compare `route`, `stage`, `errorCode`, counts and timestamps.
5. Never ask the user for password, token, recovery code, session cookie, essay, transcript or signed URL.
6. Record deployment ID, request/run/batch IDs and sanitized findings in the incident ticket.

## Instrumented events

- Readiness configuration/dependency/internal failure.
- Client route/global error boundary reports.
- Auth register/login/password-recovery/confirmation failures.
- Learning, profile and onboarding mutation failures.
- Practice answer save rejection/failure.
- Storage cleanup rejection, completion and stage-specific failure with safe counts.

Cleanup stages are `authenticate`, `validate configuration`, `acquire lease`, `claim records`, `delete storage objects`, `finalize database records` and `release lease`. The current RPC does not expose whether each claimed row came from a stale lease, so `retryCount` is logged as `null`; the documented 15-minute retry window and released lease count are still recorded. Changing this requires a reviewed forward migration.

## Incident response

- Authentication/readiness failure: keep deployment protected, verify redacted env names and dependency status; do not paste keys into tickets.
- Cleanup failure before Storage deletion: pause scheduler and retry only after state inspection.
- Cleanup failure after Storage deletion but before DB finalize: pause scheduler, inspect run/batch IDs and metadata state, then use the approved retry/forward-fix path.
- Suspected secret exposure: disable the affected job/provider, rotate the secret, invalidate sessions when applicable and follow provider log-purge procedure.
- Cross-user exposure: P0; close traffic, preserve evidence and begin privacy/security incident handling.

## Required production evidence

- Vercel JSON event visible for a controlled request ID.
- Retention/access controls for logs.
- Test alert delivered to the assigned operator.
- Cleanup successful run and controlled failure alert.
- Screenshot/run IDs with all values redacted.
