# TODOs

## Deferred: Comment moderation and deletion controls

**What:** Add moderation tools for post comments, including comment reporting, hiding, author deletion, and admin review.

**Why:** Basic task comments are now part of the detail page, but the product should not become an unmanaged nearby chat surface.

**Pros:** Keeps richer lost-and-found, questions, and street-level updates available while giving admins and authors a way to handle abuse.

**Cons:** Adds comment-specific report state, admin filters, deletion permissions, notification choices, and more detail-page complexity.

**Context:** Basic comments use local storage or the `post_comments` CloudBase collection. They currently stop on closed or expired tasks, but they do not yet have per-comment reporting or deletion.

**Depends on / blocked by:** Stable comment usage patterns and a clear abuse-handling policy.

## Deferred from v1: Saved places and full profile center

**What:** Add saved places and a complete “My” center.

**Why:** v1 should prove that users want to browse and publish nearby street tasks before building retention/account surfaces.

**Pros:** Gives returning users a way to revisit favorite POIs and manage activity history.

**Cons:** Adds saved-place models, additional pages, privacy choices, and account-state complexity.

**Context:** The design doc included saved places and a My page, but v1 intentionally keeps the surface to map, publish, detail, and admin-lite.

**Depends on / blocked by:** Enough active places and repeat usage to make saving places meaningful.

## Deferred from v1: miniprogram-ci release automation

**What:** Add `miniprogram-ci` upload/preview automation.

**Why:** Initial builds can be uploaded manually with WeChat DevTools; automation matters once test releases become frequent or collaborators join.

**Pros:** Makes preview/experience releases repeatable and reduces manual upload mistakes.

**Cons:** Requires appid, upload private key handling, CI secrets, environment separation, and release command conventions.

**Context:** The distribution plan keeps manual upload for v1 and records CI as a follow-up once the app is stable enough for repeated testing.

**Depends on / blocked by:** Mini program appid, upload private key, and agreed release environments.

## Deferred from v1: Map clustering and scalable querying

**What:** Add city-wide querying, marker clustering, and pagination for dense maps.

**Why:** v1 can be used from any location, but local mock storage and a 100 marker cap are not enough for dense city-wide usage once there is a backend.

**Pros:** Keeps the map usable as more neighborhoods and tasks become active.

**Cons:** Adds cluster rendering, pagination, recommendations, and operational complexity before density is proven.

**Context:** The accepted architecture uses geohash prefix filtering and a 100 marker cap. That is right for a focused nearby feed, not a high-density city-wide feed.

**Depends on / blocked by:** Nearby content density, retention, and quality signals.
