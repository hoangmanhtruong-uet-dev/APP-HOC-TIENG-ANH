# Authenticated E2E runbook

## Modes

- `npm.cmd run test:e2e`: public/default mode. It prints every missing authenticated variable and permits the affected tests to skip.
- `npm.cmd run test:e2e:authenticated`: required mode. It fails before starting the server when a credential or expected project ref is absent/mismatched.
- `npm.cmd run test:e2e:remote-authenticated`: staging mode. It validates the linked project, creates isolated A/B/onboarding users, runs required authenticated E2E, and deletes those exact users in `finally`.
- `npm.cmd run test:e2e:production-verification`: release alias for required mode. Run only against the approved protected deployment/project.

## Required secret configuration

Create verified dedicated accounts; never use personal or production customer accounts. Store values only in local/CI secret managers:

- `E2E_USER_A_EMAIL`, `E2E_USER_A_PASSWORD` (completed onboarding)
- `E2E_USER_B_EMAIL`, `E2E_USER_B_PASSWORD` (completed onboarding)
- `E2E_ONBOARDING_EMAIL`, `E2E_ONBOARDING_PASSWORD` (fresh/incomplete account)
- `E2E_EXPECTED_SUPABASE_PROJECT_REF`

The runner derives legacy module-specific variables from the shared A/B accounts, derives the active ref from `NEXT_PUBLIC_SUPABASE_URL`, and refuses required mode when it differs. Browser tests use normal authenticated clients and never a service-role key. The remote fixture runner obtains the service-role credential only inside its Node process for Auth Admin setup/cleanup and never forwards or prints it.

## Evidence

Record exact SHA, project ref (not credentials), command, PASS/FAIL/SKIPPED counts and Playwright trace references. Any authenticated skip caused by account state or missing configuration blocks production verification.
