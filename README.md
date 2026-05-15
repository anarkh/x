# Street Tasks

WeChat mini program for short-lived neighborhood tasks.

## North Star

Nearby short-lived information should be easy to confirm, update, and close.

The app has no fixed service area. Users can browse and publish tasks from any current location.

## What Is Included

- Map-first task browsing around the user's current location and visible map region.
- Location-agnostic identity on the map, publish, profile, and admin surfaces.
- "Find one" discovery action for sparse maps, jumping to a random nearby post.
- Publish flow with category-specific guidance, lost/found direction, place, coordinate, and expiry controls.
- Publish-success sharing prompt and detail-page share metadata.
- Task detail page with comments, confirm, stale, resolve, and report actions.
- Local duplicate prevention for repeated trust actions on the same post.
- Local login, with an admin-only management tab controlled by the local admin code in `utils/config.js`.
- Management console for search, risk filtering, reported/stale/hidden review, user feedback, and hide/close actions.
- CloudBase-backed posts, reactions, comments, and feedback when `utils/config.js` cloud settings are enabled, with local mock storage fallback for development.

## Run Locally

1. Open this folder in WeChat DevTools.
2. Use `project.config.json`; the placeholder appid is `touristappid`.
3. Run `npm run check:json` for a basic config sanity check.

For local-only development, the app falls back to `wx` local storage. For shared user data, deploy the `posts` cloud function and create the `posts`, `post_reactions`, `post_comments`, `feedback_items`, and `admins` collections in CloudBase.

## Product Scope

The current version intentionally keeps the product focused: map, publish, detail, structured trust actions, and admin-lite moderation. Deferred items are tracked in `TODOS.md`.
