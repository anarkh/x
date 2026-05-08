# Street Tasks

WeChat mini program for short-lived neighborhood tasks.

## North Star

Nearby short-lived information should be easy to confirm, update, and close.

Current pilot area: `中关村东路试点区`.

## What Is Included

- Map-first task browsing within a configurable nearby radius.
- Pilot-area identity on the map, publish, and admin surfaces.
- "Find one" discovery action for sparse maps, jumping to a random nearby post.
- Publish flow with category-specific guidance, lost/found direction, place, coordinate, and expiry controls.
- Publish-success sharing prompt and detail-page share metadata.
- Task detail page with confirm, stale, resolve, and report actions.
- Local duplicate prevention for repeated trust actions on the same post.
- Lightweight admin page for reported, stale, resolved, or expired posts, with hide and close actions.
- Local mock storage through `utils/store.js`, so the mini program can run before a backend exists.

## Run Locally

1. Open this folder in WeChat DevTools.
2. Use `project.config.json`; the placeholder appid is `touristappid`.
3. Run `npm run check:json` for a basic config sanity check.

The current implementation stores data in `wx` local storage. Replace `utils/store.js` with cloud functions or HTTP requests when the backend contract is ready.

## Product Scope

The current version intentionally keeps the product focused: map, publish, detail, structured trust actions, and admin-lite moderation. Deferred items are tracked in `TODOS.md`.
