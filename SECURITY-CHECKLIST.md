# Security Checklist

Filled before going public. Every row is answered Yes, No or N/A with one line of evidence in my own words.

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 1 | `.env` is gitignored and is not in the repository | Yes | `.gitignore` line 25; `git ls-files` shows only `.env.example` |
| 2 | A `.env.example` with placeholder values only is committed | Yes | Placeholders only (`user:password@localhost`) |
| 3 | No connection string, key, token or password is hardcoded in source, comments or commented-out code | Yes | Grepped `src/`, `server/`, `api/` for password/secret/key/token patterns; zero hits |
| 4 | Git history is clean: I searched `git log -p` for password, secret, api key and `postgres://` | Yes | Full history search clean; only hit is the localhost placeholder in `.env.example` |
| 5 | Any credential that was ever committed has been rotated | N/A | Rows 3–4 clean; nothing was ever committed, so nothing needed rotation |
| 6 | Production credentials live only in my hosting provider's environment settings | Yes | Production `DATABASE_URL` in Vercel environment settings; live deploy proves it |

## GitHub Actions

No workflows exist in this project (no `.github/workflows`), so rows 7–12 are N/A.

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 7 | No secret value is written literally in any workflow YAML file | N/A | No workflows exist |
| 8 | Secrets are stored in repository Actions secrets and read with `${{ secrets.NAME }}` | N/A | No workflows exist |
| 9 | No workflow step echoes, dumps or debug-prints a secret, and I opened a recent run's log to confirm | N/A | No workflows exist, no runs to open |
| 10 | Uploaded build artifacts contain no `.env`, key file or generated config | N/A | No workflows exist, no artifacts uploaded |
| 11 | Third-party actions are pinned to a commit SHA, not a moveable tag | N/A | No workflows exist, no third-party actions |
| 12 | Secret scanning and push protection are enabled on the repository | N/A | No workflows exist; scanning governed by GitHub defaults |

## Database

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 13 | Every query taking user input uses parameters, never string concatenation | Yes | All queries in `server/app.js` use `$1` placeholders |
| 14 | The database is not open to the whole internet, or is reachable only by the app | Yes | Neon-hosted, reachable only with the connection string over enforced SSL; no anonymous access |
| 15 | The database user the app connects as has only the permissions it needs | N/A | Single app, single provider-managed Neon role; no privilege tiers exist in this setup |
| 16 | Seed and sample data is invented, not real people's data | N/A | No seed or sample data exists at all (tables auto-create empty) |
| 17 | Debug, seed and reset routes are removed before going public | Yes | Audited all 9 routes; no debug, seed, or reset endpoints exist |

## Access control

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | No | Open game by design (no account, no setup); no gate, all 9 routes intentionally public |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | N/A | No Supabase or Firebase in this project |
| 20 | If Zero Trust: tjakoen.s@gmail.com is on the access policy. If an app password: the credentials are in my private workspace `project/README.md` | N/A | No Zero Trust or app password exists |
| 21 | The gate covers every route, including the ones that only change data | N/A | No gate exists; openness is the design, not a gap in coverage |
| 22 | The credentials for the gate are environment variables, not in source | N/A | No gate credentials exist anywhere |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 23 | Input from the user is validated on the server, not only in the browser | Yes | Server rejects bad payloads with 400s before any query, plus a 32kb JSON cap |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | All rendering is React JSX (auto-escaped); zero `innerHTML` in `src/` |
| 25 | Error responses do not expose stack traces, file paths or connection details | No | `app.js` 500 handlers return `String(err.message)`; database messages can carry host/detail (sanitize queued) |
| 26 | CORS is not a wildcard on routes that change data | Yes | No CORS middleware; API same-origin via Vercel rewrites, no wildcard anywhere |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | No | University email is the git author on all commits; source sweep and commit messages otherwise clean (only SVG-path false positives). No phone, address, student number, or private email in any file |
| 28 | No classmate's personal data in the repository | No | No classmate or third-party personal data anywhere; all content is game fiction or my own |
| 29 | Dependencies come from official registries, and `node_modules` is gitignored | Yes | npm registry versions; `node_modules` gitignored |
| 30 | Images, fonts and other assets are mine, licensed, or credited | Yes | CAPCOM credited in README and in-game disclaimer covering images and music; non-commercial fan project |
| 31 | Repository visibility is deliberate, and I checked it after my last push | No | Not yet checked; will verify GitHub settings after the final push |

## Anything I found and fixed

This checklist caught two things I had assumed: I had never actually searched history for secrets (clean, confirmed) and had never audited the 500 error paths (row 25: database messages reach the client; sanitizing is queued). Everything else confirmed what the code already showed.
