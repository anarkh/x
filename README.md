# Street Tasks

WeChat mini program for short-lived neighborhood tasks.

## What Is Included

- Map-first task browsing within a configurable nearby radius.
- Publish flow with category, place, coordinate, and expiry controls.
- Task detail page with confirm, stale, and report actions.
- Lightweight admin page for reported or stale posts.
- Local mock storage through `utils/store.js`, so the mini program can run before a backend exists.

## Run Locally

1. Open this folder in WeChat DevTools.
2. Use `project.config.json`; the placeholder appid is `touristappid`.
3. Run `npm run check:json` for a basic config sanity check.

The current implementation stores data in `wx` local storage. Replace `utils/store.js` with cloud functions or HTTP requests when the backend contract is ready.

## Product Scope

The current version intentionally keeps the product focused: map, publish, detail, structured trust actions, and admin-lite moderation. Deferred items are tracked in `TODOS.md`.
