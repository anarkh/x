# AGENTS.md

Guidance for AI coding agents working on this repository.

## Project Overview

Street Tasks is a native WeChat mini program for short-lived neighborhood tasks. The current product is intentionally small: a map-first feed, a publish flow, a task detail page, structured trust actions, and lightweight admin moderation.

The app currently runs without a backend. Data is seeded from mock posts and persisted through `wx` local storage. Treat `utils/store.js` as the persistence boundary that can later be replaced by cloud functions or HTTP APIs.

## Tech Stack

- Native WeChat mini program files: `.js`, `.json`, `.wxml`, `.wxss`
- JavaScript ES modules
- Local persistence through `wx.getStorageSync` / `wx.setStorageSync`
- WeChat location APIs using `gcj02`
- No build framework and no frontend package bundler

## Important Files

- `app.js`: app bootstrap, guest user initialization, and global center state.
- `app.json`: page registry, tab bar, window style, and location permission declaration.
- `project.config.json`: public WeChat DevTools config. Keep `appid` as `touristappid` for GitHub.
- `project.private.config.json`: local-only WeChat DevTools config. This may contain the real AppID and must stay ignored.
- `utils/config.js`: nearby feed config, categories, and expiry options.
- `utils/store.js`: mock/local data store and post mutation APIs.
- `utils/geo.js`: distance calculation and map marker conversion.
- `utils/format.js`: category and time display helpers.
- `utils/mock-posts.js`: seed data used when local storage is empty.
- `pages/map/*`: map feed, marker interactions, and list overlay.
- `pages/publish/*`: task creation flow.
- `pages/detail/*`: detail view and confirm/stale/report actions.
- `pages/admin/*`: admin-lite moderation view.
- `scripts/check-json.mjs`: JSON syntax check for project and page config files.

## Local Development

1. Open the repository in WeChat DevTools.
2. Keep `project.config.json` with the placeholder AppID:

   ```json
   "appid": "touristappid"
   ```

3. Put the real local AppID in `project.private.config.json`. WeChat DevTools gives this file higher priority for local settings, and `.gitignore` excludes it from version control.
4. Run the JSON sanity check after editing any `.json` config:

   ```bash
   npm run check:json
   ```

There is no general unit test suite yet.

## Data Model Notes

Posts are plain objects with these important fields:

- `id`: string post id such as `post_001` or `post_${Date.now()}`.
- `markerId`: numeric map marker id.
- `title`, `body`, `category`, `placeName`.
- `latitude`, `longitude`.
- `status`: `active`, `stale`, `expired`, or `hidden`.
- `confirmations`, `staleCount`, `reportCount`.
- `createdAt`, `expiresAt`: timestamps in milliseconds.
- `publisher`: display name.

`listPosts(center)` computes derived status and distance, filters hidden posts, sorts newest first, and caps results by `config.maxVisiblePosts`.

## Behavior Rules

- Confirming a post increments `confirmations`.
- Marking a post stale increments `staleCount`; after 3 stale reports, status becomes `stale`.
- Reporting a post increments `reportCount`; after 2 reports, status becomes `hidden`.
- Expired posts are marked as `expired` when listed.
- Hidden posts should not appear in normal list results.

## Coding Conventions

- Follow the existing native WeChat mini program style.
- Keep shared behavior in `utils/*` instead of duplicating page logic.
- Keep public user-facing copy in Chinese unless the surrounding file is developer documentation.
- Avoid adding dependencies unless the feature clearly needs them.
- Use `wx.navigateTo` for non-tab pages and `wx.switchTab` for tab pages.
- Preserve the local-storage API shape in `utils/store.js` unless replacing the persistence layer deliberately.
- Keep JSON files strict JSON with no comments.

## Security And Git Hygiene

Do not commit local secrets or machine-specific files.

Ignored local files currently include:

- `project.private.config.json`
- `.agents/`
- `.claude/`
- `skills-lock.json`
- `log/`
- `*.log`
- `node_modules/`
- `miniprogram_npm/`

The file `aaa` is also ignored and may contain local sensitive proxy configuration. Do not add it with `git add -f`.

Before pushing, run:

```bash
rg --no-ignore -n -i "(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|session|cookie|authorization|bearer|access[_-]?token|refresh[_-]?token|client[_-]?secret|appsecret|wx[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
npm run check:json
git status --short --ignored
```

Expected secret-scan caveat: `TODOS.md` may mention future `appid`, private key, and CI secret handling as plain text. That is documentation, not an actual secret.

## Common Tasks

When changing categories:

- Update `utils/config.js`.
- Check formatting behavior in `utils/format.js`.
- Verify publish picker and map/detail/admin labels.

When changing post storage:

- Keep `listPosts`, `getPost`, `createPost`, `reactToPost`, and `hidePost` as the page-facing API unless there is a deliberate refactor.
- Make sure hidden and expired post behavior stays consistent.

When changing map behavior:

- Update marker generation in `utils/geo.js`.
- Verify `pages/map/map.js` marker taps still navigate with the post id.

When changing app identity:

- Public project metadata should stay generic.
- Real WeChat AppID belongs in `project.private.config.json`, not `project.config.json`.
