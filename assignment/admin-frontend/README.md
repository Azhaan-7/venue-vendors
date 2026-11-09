# Venue Vendors admin frontend

The administrator interface, built with Next.js, React, TypeScript, Chakra UI and Apollo Client. It supports venue management and reports with PDF export, using the GraphQL API through `/graphql` and REST authentication through `/api`.

See the [root README](../../README.md) for features, environment setup, architecture, verification and hosting considerations.

After configuring `.env.local`, run from this directory:

```bash
npm ci
npm run dev -- --port 3002
```

Open `http://localhost:3002`. The default upstreams are `http://localhost:3001` for `BACKEND_URL` and `http://localhost:3003` for `ADMIN_BACKEND_URL`. Admin accounts must be provisioned separately by an authorized database owner in the development environment; public signup does not grant administrator access.

Copyright © 2026 RMIT University. Originally developed for Full Stack Development, Semester 1, 2026, by Dilushi Mirthula Rajendran and Azhaanul Haque Farooqui. See the root README for publication and attribution details.
