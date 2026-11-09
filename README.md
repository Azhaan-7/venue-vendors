# Venue Vendors

## Project overview

Venue Vendors is a full-stack portfolio project for finding venues, submitting event applications and managing booking decisions. It provides separate workflows for hirers, vendors and administrators.

Use sample accounts and documents for demonstrations; do not upload real identity documents.

## Key features

- **Hirers:** Manage profiles, supporting documents and a server-calculated profile-completeness score, search venues, rank preferences, save event drafts, submit applications and review application and hiring history.
- **Vendors:** Manage venues and blocked periods, review applicant information and documents, approve or reject applications, leave comments and view venue utilisation charts.
- **Administrators:** Create, edit, delete and feature venues, assign vendors, and view booking and applicant reports with PDF export.

## Tech stack

- **Interfaces:** TypeScript, React, Next.js and Chakra UI; Axios for REST requests and Apollo Client for GraphQL.
- **APIs and data:** Node.js, Express, Apollo Server, GraphQL, TypeORM and Microsoft SQL Server / Azure SQL.
- **Authentication:** Signed JWT sessions in HttpOnly cookies and Argon2id password hashing.
- **Charts and reports:** Chart.js, react-chartjs-2 and jsPDF.
- **Quality checks:** Jest, React Testing Library, Node.js test runner, ESLint and TypeScript.

## Architecture

The repository contains four independently run applications:

| Application | Directory | Local address |
| --- | --- | --- |
| Hirer and vendor interface | `assignment/frontend` | `http://localhost:3000` |
| REST API | `assignment/backend` | `http://localhost:3001/api` |
| Admin interface | `assignment/admin-frontend` | `http://localhost:3002` |
| Admin GraphQL API | `assignment/admin-backend` | `http://localhost:3003/graphql` |

Both interfaces proxy browser requests through their own origin. The regular interface uses the REST API; the admin interface uses REST for authentication and GraphQL for administration. Both APIs share the SQL database. Database schema synchronisation and automatic migrations are disabled.

## Local development

### Prerequisites

Use Node.js **22 or 24**, npm, and a SQL Server / Azure SQL development database with a compatible schema. Startup does not create the database schema. Prepare and verify a compatible development schema separately before starting either API; this repository does not yet include a reproducible migration baseline.

### Environment

Copy each backend's `.env.example` to `.env` in the same directory. Set the following in **both** backend files, using the same development database and randomly generated JWT secret:

```env
DB_HOST=<development-database-host>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>
JWT_SECRET=<shared-random-secret-at-least-32-bytes>
NODE_ENV=development
```

Set `FRONTEND_ORIGINS=http://localhost:3000,http://localhost:3002` in `assignment/backend/.env` and `ADMIN_FRONTEND_ORIGINS=http://localhost:3002` in `assignment/admin-backend/.env`. Keep credentials out of source control.

Copy each frontend's `.env.example` to `.env.local` in its directory:

```env
# assignment/frontend/.env.local
BACKEND_URL=http://localhost:3001
```

```env
# assignment/admin-frontend/.env.local
BACKEND_URL=http://localhost:3001
ADMIN_BACKEND_URL=http://localhost:3003
```

### Run the applications

Run `npm ci` inside each application directory, then start each application in a separate terminal:

| Directory | Commands |
| --- | --- |
| `assignment/backend` | `npm run build`, then `npm start` |
| `assignment/admin-backend` | `npm run build`, then `npm start` |
| `assignment/frontend` | `npm run dev -- --port 3000` |
| `assignment/admin-frontend` | `npm run dev -- --port 3002` |

Create hirer and vendor accounts through signup. Admin accounts must be provisioned separately by an authorized database owner in the development environment; public signup does not grant administrator access.

### Verification

Run `npm test`, `npm run typecheck` and `npm run build` in each application directory. Both frontends also support `npm run lint` and `npm test -- --runInBand`; the backends have no lint script.

Backend tests use an offline isolation guard, synthetic fixtures and repository stubs. They do not connect to SQL Server or verify the live schema. Builds do not start the APIs. Use a development database for runtime testing.

For opt-in real SQL concurrency checks, start Docker's local Linux engine and run `npm run test:sql` inside `assignment/backend`. On Windows, open Docker Desktop from the Start menu before running the test. The runner uses Microsoft's SQL Server 2022 Developer image, a new loopback-only container with a 3 GB memory limit, generated credentials and synthetic data. It creates only disposable test schemas and removes its container on completion. It does not read database credentials from `.env` or connect to Azure. The 22 checks cover competing approvals, adjacent/overnight events, venue blocks and transaction rollback with `READ_COMMITTED_SNAPSHOT` off and on. This test schema is not a migration baseline for existing databases.

## Current status and limitations

This is a portfolio demonstration, not a production booking service. Use synthetic accounts and sample documents.

- Login bootstrap requests cannot overwrite newer signin/signout state. Authentication has account-based failed-attempt limits alongside public API limits.
- Opening either frontend sends a background health request to wake its backend services (REST for the main frontend; REST and GraphQL for admin). It runs once per full page load, sends no session credentials, and stops waiting after 70 seconds. Cold starts can still delay the first API call; there is no recurring keep-alive.
- Booking submissions and approvals check availability on the server. Transaction-held venue locks coordinate approvals and blocked periods; events use Australia/Sydney wall time and half-open intervals, so adjacent bookings are allowed.
- Profile completeness awards one point each for a saved name, valid phone, licence upload, insurance upload and business-registration upload. It measures presence, not identity verification or hiring reputation. The score is calculated from saved data without a database backfill.
- Offline regression tests exercise authorization, failure handling, booking decisions, session races and document operations. The separate SQL integration suite verifies actual concurrent SQL Server behavior; Azure schema compatibility and deployed browser flows still need staging verification.
- A compatible development schema must be prepared separately. A reproducible schema baseline, deployed client-IP verification, document-access retention policy and booking-completion/history workflow remain follow-up work. This project is not certified for production use.

## Deployment

Automatic Git deployments are disabled by the Vercel configuration files. Enable them deliberately when the project is ready to deploy; pushing code alone is intended to leave the hosted frontends unchanged.

The frontends support Vercel hosting, with the REST and GraphQL APIs hosted separately on Render and connected to Azure SQL. Configure backend origins and secrets in the hosting environment. Hosting an instance also requires a compatible database schema, appropriate database permissions and end-to-end verification; the local test suites do not establish production readiness.

## Acknowledgments

Copyright © 2026 RMIT University.

Originally developed for **Full Stack Development, Semester 1, 2026**, by **Dilushi Mirthula Rajendran** and **Azhaanul Haque Farooqui**. The original course lecturer granted permission to publish and self-host the project subject to attribution. This repository does not grant an open-source licence or claim a transfer of copyright.
