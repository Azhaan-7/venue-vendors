# Venue Vendors

Copyright © 2026 RMIT University.

Venue Vendors started as an assignment in the **Full Stack Development course, Semester 1, 2026**. The original group members are **Dilushi Mirthula Rajendran** and **Azhaanul Haque Farooqui**, as recorded in this repository's original team list. The original course lecturer granted permission to publish and self-host the project subject to attribution. This repository does not grant an open-source licence or claim a transfer of copyright.

This is a small portfolio demonstration. Use sample accounts and documents; do not upload real identity documents. Read [DEPLOYMENT.md](DEPLOYMENT.md) and [SECURITY_REVIEW.md](SECURITY_REVIEW.md) before public deployment. There is no automatic database schema synchronization or migration on startup.

[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23768257&assignment_repo_type=AssignmentRepo)

## Team Members

* Dilushi Mirthula Rajendran
* Azhaanul Haque Farooqui

## GitHub Repository

Maintained personal repository: https://github.com/Azhaan-7/venue-vendors

Original course repository (read-only attribution reference): https://github.com/rmit-fsd-2026-s1/a2-fsd-pra01-02-wed-6-30pm-alex-team10

---

# Historical Course Deployment Links

For the current Vercel Hobby + Render Free deployment configuration, see [DEPLOYMENT.md](DEPLOYMENT.md).

## VV System

Frontend:
https://vv-vendors-frontend-team-10.onrender.com

Backend:
https://vv-backend-team-10.onrender.com

## Admin System

Frontend:
https://admin-frontend-team-10.onrender.com

Backend:
https://admin-backend-team-10.onrender.com

---





## Prerequisites

Install:

* Node.js 22 or 24 (use the same major version on all hosts)
* npm
* Microsoft SQL Server database access

---

## VV Backend


```bash
cd assignment/backend
npm ci
npm run build
npm start
```

Create a `.env` file inside `assignment/backend`:

```env
DB_HOST=<database-host>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>
JWT_SECRET=<shared-random-secret-at-least-32-bytes>
```

Backend URL:

```text
http://localhost:3001
```

---

## VV Frontend



```bash
cd assignment/frontend
npm ci
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

---

## Admin Backend



```bash
cd assignment/admin-backend
npm ci
npm run build
npm start
```

Create a `.env` file inside `assignment/admin-backend`:

```env
DB_HOST=<database-host>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>
JWT_SECRET=<shared-random-secret-at-least-32-bytes>
```

GraphQL endpoint:

```text
http://localhost:3003/graphql
```

---

## Admin Frontend


```bash
cd assignment/admin-frontend
npm ci
npm run dev
```

Create a `.env.local` file inside `assignment/admin-frontend`:

```env
BACKEND_URL=http://localhost:3001
ADMIN_BACKEND_URL=http://localhost:3003
```

Admin frontend URL:

```text
http://localhost:3002
```

---

# Features Implemented

## Hirer

 Create and manage profile
 Upload required documents
 Create event applications
 Rank venue preferences
 Save event drafts
 View application history
 View hiring history
 Backend and frontend validation

## Vendor

 Manage venues
 Approve or reject applications
 View hirer information
 Manage blocked periods
 View venue utilisation statistics
 Generate reports

## Admin (HD)

 Admin login
 View all venues
Create venues
 Edit venues
 Delete venues
 Assign vendors to venues
 Select featured venues
 Generate reports
 GraphQL-based database operations

---

# References

## Course Materials

 Week 7   – Node.js, Express.js and TypeORM
 Week 8   – Database Integration and REST APIs
 Week 9   – GraphQL Introduction
 Week 10  – GraphQL Queries, Mutations and Resolvers
 Week 11  – GraphQL Subscriptions

## Documentation

 https://typeorm.io
 https://www.apollographql.com/docs
 https://graphql.org
 https://chakra-ui.com
 https://nextjs.org/docs
 https://react.dev

---

# Generative AI Usage

Generative AI tools were used during development for:

Explaining GraphQL concepts and Apollo Client usage.
Reviewing TypeScript compilation errors.
Assisting with debugging backend validation logic.
Reviewing deployment configuration for Render.
Reviewing React component structure and TypeScript typing.
Assisting with project documentation.
Formatting README.md

All generated suggestions were reviewed, modified, tested and integrated by us before inclusion in the final submission.

## Offline verification

Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build` inside each of the four existing `assignment/` application directories. The frontend tests can use `npm test -- --runInBand`; each frontend also has `npm run lint`. Backends have no configured lint command. Review `npm audit` and `npm audit --omit=dev` separately.

Backend test commands preload an isolation guard that prevents TypeORM initialization, migrations and raw database queries. Tests use repository stubs, local HTTP listeners and offline MSSQL metadata compilation. Builds do not start backends. Do not run `npm start`, `npm run dev`, TypeORM CLI commands, or ad hoc database scripts against production during verification.
