---
name: Midanic API routing
description: The Midanic web and API are separate artifacts, so local and published request routing behave differently.
---

The Midanic frontend and Express API are separate artifacts. In development, Vite must proxy `/api` to the API service; otherwise its SPA fallback returns `index.html` and JSON clients fail on the leading `<`. In production, the `/api` path is expected to be routed by the artifact services rather than by the static frontend.

**Why:** The CRM failure produced HTML with HTTP 200 instead of JSON because the browser request reached the frontend fallback rather than the API.

**How to apply:** Keep same-origin frontend requests (`/api/...`), retain the Vite `/api` proxy for development, and verify `/api/healthz` plus an authenticated CRM endpoint on the published URL after each deployment or routing change.