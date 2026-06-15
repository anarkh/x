# CI Required Check Runbook

## Purpose

This runbook explains how to verify that the remote GitHub Actions readiness workflow actually runs, how to identify the required check name, and how to configure that check in branch protection.

Local `npm run check`, this workflow, and branch protection are separate gates. Passing any of them does not prove WeChat DevTools, real-device UI, or map-list visual acceptance passed.

## Stable Check Target

- Workflow file: `.github/workflows/readiness.yml`
- Workflow name: `Readiness checks`
- Job id: `readiness`
- Job display name: `readiness / npm run check`
- Command guarded by the job: `npm run check`

Use the exact check name shown by GitHub when configuring branch protection. GitHub may display the check as the job display name alone or together with the workflow name, depending on the repository UI.

## Verify Remote Workflow Trigger

1. Push the branch containing `.github/workflows/readiness.yml`, or open/update a pull request from that branch.
2. Open the repository's GitHub Actions tab and select `Readiness checks`.
3. Confirm the run is for the expected branch or pull request and trigger event (`push` or `pull_request`).
4. Open the run and confirm the `readiness / npm run check` job executed `npm ci --ignore-scripts` and `npm run check`.
5. Record the workflow run URL, branch or PR, trigger event, commit SHA, final status, and any failure summary.

Do not record the workflow as verified until a remote run exists and its final status has been checked in GitHub.

## Configure Branch Protection

1. In GitHub repository settings, open Branches and edit the target branch protection rule.
2. Enable required status checks before merging.
3. Search for and select the exact readiness check reported by a completed remote run, expected around `readiness / npm run check`.
4. Save the rule.
5. Open or update a test pull request and confirm GitHub marks that check as required.
6. If practical, verify a failing run blocks merge and a passing run clears the required check.

Do not mark branch protection as configured until the repository settings show the readiness check as required and a pull request displays it as a required check.

## Evidence Log Template

```text
Status: unverified | verified | blocked
Repository:
Branch or PR:
Commit SHA:
Trigger event:
Workflow run URL:
Observed check name:
Required check configured: yes | no | blocked
Result:
Next action:
```

## Reporting Rules

- If there is no remote workflow run URL, report the workflow as local-only and unverified.
- If branch protection has not been inspected or changed in GitHub settings, report required check configuration as unverified.
- If the check is configured but no pull request has shown it as required, report branch protection behavior as partially verified.
- If `npm run check` passes in CI, report only static/readiness gates as passed.
- Keep DevTools, real-device UI, and visual smoke evidence separate from CI readiness evidence.
