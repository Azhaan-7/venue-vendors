# Venue Vendors frontend

The hirer and vendor interface, built with Next.js, React, TypeScript and Chakra UI. It uses the REST API through the same-origin `/api` proxy.

See the [root README](../../README.md) for features, environment setup, architecture and verification, and [DEPLOYMENT.md](../../DEPLOYMENT.md) for deployment details.

After configuring `.env.local`, run from this directory:

```bash
npm ci
npm run dev -- --port 3000
```

Open `http://localhost:3000`. The default API upstream is `http://localhost:3001`, configured through `BACKEND_URL`.

Copyright © 2026 RMIT University. Originally developed for Full Stack Development, Semester 1, 2026, by Dilushi Mirthula Rajendran and Azhaanul Haque Farooqui. See the root README for publication and attribution details.
