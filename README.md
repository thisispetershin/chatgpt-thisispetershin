# LifeOS: personal dashboard

A static, no-build personal command center. Open `index.html` locally or host it on GitHub Pages.

| Page | What it does |
|---|---|
| `index.html` **Dashboard** | Today's schedule, notices, automated work and its progress, a funnel evaluation (노출 → 인지 → 고려 → 방문 → 구매결정) with the biggest leak and fixes, a 4Ps scorecard, unit economics, a growth playbook (offer ladder, research & user journey, measurement, content automation, content-as-business), and a log of last session's changes with a keep/iterate/revert verdict. |
| `schedule.html` **Schedule** | Week grid of routines and events, upcoming notices, browser reminders, and an `.ics` export for phone calendar alerts. |
| `quests.html` **Quests** | A goal questionnaire (year → month → week), boss bars per goal, a quest map of deadlines, a quest board with XP, levels, streaks and achievements, plus "split" and "+3 days" so big or overdue tasks feel light. |
| `news.html` **News & Learn** | AI workflow, AI creativity, AI industry and Web3 headlines, plus a daily Web3 term ("one day, one discovery"). |

## Data
Everything you enter is saved in your browser's localStorage. Use **Export backup / Import** on the Dashboard to move it between devices. The starter entries are examples. Edit or delete them.

## News automation
`.github/workflows/news.yml` runs `scripts/fetch_news.py` every day at 06:17 KST. The script needs only the Python standard library. It writes `data/news.json` and commits the file. To run it now, open the **Actions** tab, choose **Daily news refresh**, and click **Run workflow**. Edit the `FEEDS` list in the script to change sources.

## Hosting (GitHub Pages)
Go to Settings → Pages, set Source to "Deploy from a branch", and pick your branch with the `/ (root)` folder. The news page has to be served over http(s), so opening the file directly won't load headlines.
