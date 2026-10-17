# Venue Vendors

## Project overview

Venue Vendors is a full-stack portfolio project for finding venues, submitting event applications and managing booking decisions. It provides separate workflows for hirers, vendors and administrators.

Use sample accounts and documents for demonstrations; do not upload real identity documents.

## Key features

- **Hirers:** Manage profiles and supporting documents, search venues, rank preferences, save event drafts, submit applications and review application and hiring history.
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

Use Node.js **22 or 24**, npm, and a SQL Server / Azure SQL development database with a compatible schema. Startup does not create the database schema; see [DEPLOYMENT.md](DEPLOYMENT.md) for database preparation requirements.

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

Create hirer and vendor accounts through signup. Admin access requires manual provisioning as described in [DEPLOYMENT.md](DEPLOYMENT.md).

### Verification

Run `npm test`, `npm run typecheck` and `npm run build` in each application directory. Both frontends also support `npm run lint` and `npm test -- --runInBand`; the backends have no lint script.

Backend tests use an offline isolation guard, synthetic fixtures and repository stubs. They do not connect to SQL Server or verify the live schema. Builds do not start the APIs. Use a development database for runtime testing.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel and Render configuration, environment variables, database prerequisites and deployment checks. [SECURITY_REVIEW.md](SECURITY_REVIEW.md) records verification results and known limitations.

## Acknowledgments

Copyright © 2026 RMIT University.

Originally developed for **Full Stack Development, Semester 1, 2026**, by **Dilushi Mirthula Rajendran** and **Azhaanul Haque Farooqui**. The original course lecturer granted permission to publish and self-host the project subject to attribution. This repository does not grant an open-source licence or claim a transfer of copyright.
