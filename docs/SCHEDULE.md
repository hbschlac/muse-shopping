# Running the timed jobs on time

GitHub starts scheduled workflows late on quiet repos. On 2026-11-10 the
"every 10/15 minutes" jobs were starting about every 8 hours. So a free outside
timer starts `.github/workflows/tick.yml` every 5 minutes, and tick starts
whatever is due:

| Minute (UTC) | Job |
|---|---|
| :00, :10, :20, … | `poll-new-arrivals.yml` (Rakuten) |
| :00, :15, :30, :45 | `refresh-listings.yml` (store scripts) |
| :05, :20, :35, :50 | `dispatch-alerts.yml` (push alerts backstop) |

The jobs keep their own GitHub schedules as a backup. A job that runs twice is
harmless.

Cost: $0. The repo is public, so Actions minutes are free, and cron-job.org is free.

## The token

cron-job.org holds one GitHub token. It can only start, re-run or cancel
workflows in `muse-shopping`. It cannot read secrets, push code or merge.

1. Go to https://github.com/settings/personal-access-tokens/new
2. Name it `Muse tick (cron-job.org)` and set expiration to 1 year.
3. Under Repository access, choose **Only select repositories** and pick `hbschlac/muse-shopping`.
4. Under Permissions → Repository permissions, set **Actions: Read and write**.
   Metadata (read) is added automatically. Leave everything else at No access.
5. Generate the token and copy it. Don't paste it anywhere else.

## The timer (cron-job.org)

1. Sign up at https://cron-job.org (free) with hannah@muse.shopping.
2. Click **Create cronjob**.
   - Title: `Muse tick`
   - URL: `https://api.github.com/repos/hbschlac/muse-shopping/actions/workflows/tick.yml/dispatches`
   - Schedule: every 5 minutes
3. On the **Advanced** tab:
   - Request method: `POST`
   - Headers:
     - `Authorization: Bearer <the token>`
     - `Accept: application/vnd.github+json`
     - `Content-Type: application/json`
   - Request body: `{"ref":"main"}`
4. Click **Test run**. A good result is HTTP **204**. A 401 means a bad token.
   A 404 means the token can't see the repo, or tick.yml isn't on main yet.
5. Save. Under Notifications, turn on "notify on failure" so a revoked or
   expired token emails you.

## Checking it

GitHub → Actions → **Tick**. You should see a run every 5 minutes, and each
run's log names the jobs it started. When the token expires, the timer fails,
cron-job.org emails you, and the GitHub schedules keep running (late).
