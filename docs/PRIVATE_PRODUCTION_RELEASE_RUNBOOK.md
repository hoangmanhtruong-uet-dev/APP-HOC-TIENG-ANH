# Private production release runbook

## 1. Scope and fixed decisions

This runbook releases IELTS Flow to a private Vercel production deployment. It does not authorize public traffic.

- Hosting: Vercel.
- Access: private/protected deployment only.
- Database/Auth/Storage: a new Supabase production project, never the dev/staging project.
- AI providers: disabled; leave all optional OpenAI variables unset.
- Domain and support mailbox: configured manually by the operator before release.
- Database changes: forward-only. Never reset a linked project or edit an applied migration.

## 2. Required roles

Record people or accountable operational roles in the release ticket:

- Release owner: approves the exact commit and Vercel deployment.
- Cloud operator: configures Vercel, DNS, Supabase, SMTP and scheduler.
- Privacy operator: owns the support mailbox and DSR tickets.
- Rollback operator: has permission to restore the previous Vercel artifact and pause writes/jobs.

The release remains `NO-GO` while any role is unassigned.

## 3. Evidence directory

Create `docs/production-readiness-evidence/private-release-YYYYMMDD/` or an access-controlled release ticket. Store no secret values.

Required identifiers:

- Release commit SHA and CI run URL.
- Vercel project, deployment ID/URL and previous deployment ID/URL.
- Production Supabase project ref.
- Migration parity output and verifier summary.
- Backup recovery point and restore rehearsal reference.
- Scheduler run ID and uptime alert test.
- Post-deploy smoke results and final go/no-go approval.

## 4. Vercel manual setup

1. Create a new Vercel project for private production.
2. Enable the strongest deployment protection available for the account/plan. Do not rely on an unguessable URL.
3. Set Node/build commands from `package.json`: `npm ci`, `npm run build`, `npm run start` where applicable.
4. Configure the canonical HTTPS domain only after DNS/TLS is ready.
5. Add environment variables in Vercel's secret/environment UI. Never paste server secrets into source, build logs or screenshots.
6. Leave all optional OpenAI variables absent.
7. Capture an environment-variable-name screenshot with values hidden.
8. Record the current and previous immutable deployment identifiers before any traffic switch.

### Required production variables

Public:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_CLEANUP_SECRET` (minimum 32 characters)
- `SPEAKING_PIPELINE_SIGNING_SECRET` (minimum 32 characters and synchronized with Supabase Vault)

Optional AI variables must all remain unset for the first private release.

## 5. New Supabase production project

1. Create a dedicated production project and record its ref without credentials.
2. Configure backup/PITR, Auth, SMTP, rate limits, leaked-password protection and CAPTCHA before application deployment.
3. Create the required Vault signing secret without exposing its value.
4. Use an isolated release checkout/config directory when linking the CLI so the dev/staging link is not silently replaced.
5. Confirm the target ref before every remote command.

```powershell
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run
npx.cmd supabase db push --linked
npx.cmd supabase migration list --linked
npx.cmd supabase db lint --linked --level warning
```

For a new empty production project, apply only reviewed forward migrations. Do not run `db reset --linked` and do not run an unreviewed production seed.

Run `supabase/tests/remote/phase_10c_production_hardening_remote.test.sql` as database owner inside `BEGIN ... ROLLBACK`. Do not store the credential.

## 6. Release verification

Run in a clean checkout with no Next dev server holding the SWC binary:

```powershell
npm.cmd ci
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
```

If `npm ci` fails because SWC is locked, stop the relevant dev server/process and rerun `npm ci`. Do not substitute `npm install --ignore-scripts` as release evidence.

## 7. Deploy and private smoke

Deploy the exact reviewed SHA while access protection remains enabled. Verify:

1. `/api/health/live` returns 200.
2. `/api/health/ready` returns 200 with `status: ready` and optional AI `disabled`.
3. Missing/invalid required env in a controlled non-production check returns 503 and only field names, never values.
4. Public pages, Auth confirmation, protected redirects and owner flows work.
5. Terms/privacy show the real support mailbox and canonical domain.
6. Draft, answer key, transcript, audio and other users' data remain inaccessible.
7. Speaking upload uses the private bucket and a server-verified path.
8. Cleanup without a valid bearer returns 404 with `Cache-Control: no-store`.
9. The scheduler completes one approved low-risk run after backup evidence exists.
10. The uptime monitor receives readiness 200 and a test alert reaches the operator.

### Authentication release mode

Password-recovery code is present, but private production remains **invite-only** until all of the following have real evidence: Supabase Auth site URL and redirect allowlist, SMTP delivery from the real domain, one successful recovery with a dedicated account, and rejection of an expired/used link. Code or local tests alone do not satisfy this gate. If any check fails, close registration/recovery and use the last verified invite allowlist.

### Required authenticated verification

Provision dedicated users A/B in the new production project and run `npm.cmd run test:e2e:production-verification` against the protected deployment. Zero unexpected skips are allowed. Follow [AUTHENTICATED_E2E_RUNBOOK.md](./AUTHENTICATED_E2E_RUNBOOK.md); browser tests must never receive a service-role key.

### Observability gate

Generate a controlled request ID, locate its structured event in the exact Vercel deployment, and deliver one safe test alert. Record only deployment/request/run IDs and sanitized findings. Follow [OBSERVABILITY_INCIDENT_RUNBOOK.md](./OBSERVABILITY_INCIDENT_RUNBOOK.md).

### CSP and HSTS gate

The enforced CSP is a baseline, not a hardened nonce policy, while it contains `unsafe-inline`. HSTS is host-only by default. Leave `ENABLE_HSTS_PRELOAD` unset/false until the apex and every in-scope subdomain are confirmed HTTPS and the preload decision is explicitly approved.

## 8. Release decision

Private production is `GO` only when every P0/P1 checklist item is `PASS` with evidence. `BLOCKED_BY_EXTERNAL_CONFIGURATION` and `NOT_VERIFIED` are not approval. Keep deployment protection enabled after GO; public launch requires a separate decision outside this sprint.

Use [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md) for any failed gate or post-deploy incident.
