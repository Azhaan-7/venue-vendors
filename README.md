# Venue Vendors

Venue Vendors is a full-stack web app for finding venues and managing event bookings. Hirers can compare venues and send applications, vendors can manage their spaces and bookings, and admins can manage venues and reports.

We originally built this for our Full Stack Development course at RMIT. It has since been updated as a portfolio project.

## Live demo

- [Hirer and vendor frontend](https://venue-vendors-xu32.vercel.app/)
- [Admin frontend](https://venue-vendors-2rq2640wr-azhaan-7.vercel.app/signin)

Use sample accounts and documents when trying the app. Please don't upload real identity documents. The backends may take a while to wake up on the first visit.

## Demo accounts

These logins are public and only for trying the demo. Use the [main frontend](https://venue-vendors-xu32.vercel.app/signin) to sign in.

| Role | Email | Password |
| --- | --- | --- |
| Hirer | `hirer.demo@example.com` | `HirerDemo!2026` |
| Hirer | `hirer.events@example.com` | `EventsDemo!2026` |
| Vendor | `vendor.demo@example.com` | `VendorDemo!2026` |
| Vendor | `vendor.spaces@example.com` | `SpacesDemo!2026` |

The two vendors each manage four fictional venues, with different locations, capacities, prices and event types. Names, descriptions and prices are sample data, and the existing venue photos are illustrative. Visitors share these accounts, so please use sample information only. Admin credentials are kept private because admin access can change all venues and reports.

To add the demo data to a configured database, run these commands in `assignment/backend`:

```bash
npm run seed:demo             # Preview what would be added
npm run seed:demo -- --apply  # Add the demo users and venues
```

Each demo hirer also has four sample applications: one pending, one rejected, one upcoming approved booking and one past approved booking with a five-star sample hiring-history entry. Both vendors have applicants to review and confirmed bookings for their charts. These are fictional examples, not real customer activity.

After seeding users and venues, add this activity with:

```bash
npm run seed:demo-activity             # Preview sample activity
npm run seed:demo-activity -- --apply  # Add applications and bookings
```

Activity dates are based on Sydney time when first seeded. Reruns preserve existing applications and visitor decisions; they do not refresh old dates. Confirmed bookings respect existing venue availability, and historical bookings have no uploaded documents.

The seed uses the backend's database environment variables. It runs in a transaction, skips existing matching demo records and never resets existing passwords or replaces venues. It stops if a demo email or venue belongs to a different account. It does not run automatically at startup or change the database schema.

## Features

- **Hirers:** Search and compare venues, rank preferences, manage profiles and documents, save event drafts, submit applications and view application and hiring history.
- **Vendors:** Manage venues and unavailable dates, review applications and documents, approve or reject bookings, leave comments and view venue usage charts.
- **Admins:** Create, edit, delete and feature venues, assign vendors, and export booking and applicant reports as PDFs.

Profile completeness is calculated from saved profile details and uploads. It checks whether information is present; it does not verify identity or measure hiring reputation.

## Built with

- **Frontend:** Next.js, React, TypeScript and Chakra UI, with Axios for REST requests and Apollo Client for GraphQL.
- **Backend:** Node.js, Express, Apollo Server, GraphQL and TypeORM.
- **Database:** Microsoft SQL Server / Azure SQL.
- **Authentication:** JWT sessions in HttpOnly cookies and Argon2id password hashing.
- **Charts and reports:** Chart.js, react-chartjs-2 and jsPDF.
- **Testing:** Jest, React Testing Library, Node.js test runner, ESLint and TypeScript.

## Running locally

You need Node.js **22 or 24**, npm and a SQL Server / Azure SQL development database with a compatible schema. The app does not create or migrate the database schema automatically, and the repo does not yet include a reproducible schema baseline.

There are four apps. Run `npm ci` in each directory, then start them in separate terminals:

| App | Directory | Start command | Local URL |
| --- | --- | --- | --- |
| Main frontend | `assignment/frontend` | `npm run dev -- --port 3000` | http://localhost:3000 |
| REST API | `assignment/backend` | `npm run build`, then `npm start` | http://localhost:3001/api |
| Admin frontend | `assignment/admin-frontend` | `npm run dev -- --port 3002` | http://localhost:3002 |
| Admin GraphQL API | `assignment/admin-backend` | `npm run build`, then `npm start` | http://localhost:3003/graphql |

Both APIs use the same database. Browser requests go through the frontend's own origin: `/api` for REST and `/graphql` for admin GraphQL requests.

### Environment setup

Copy each backend's `.env.example` to `.env` in the same directory. Use the same development database and a shared, randomly generated JWT secret in both:

```env
DB_HOST=<development-database-host>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>
JWT_SECRET=<shared-random-secret-at-least-32-bytes>
NODE_ENV=development
```

Set `FRONTEND_ORIGINS=http://localhost:3000,http://localhost:3002` in `assignment/backend/.env` and `ADMIN_FRONTEND_ORIGINS=http://localhost:3002` in `assignment/admin-backend/.env`.

Copy each frontend's `.env.example` to `.env.local`. Set these values:

```env
# assignment/frontend/.env.local
BACKEND_URL=http://localhost:3001
```

```env
# assignment/admin-frontend/.env.local
BACKEND_URL=http://localhost:3001
ADMIN_BACKEND_URL=http://localhost:3003
```

Keep credentials out of source control. Hirers and vendors can create accounts through signup. Admin accounts must be provisioned separately by an authorised database owner; public signup does not give admin access.

## Checks

Run `npm test`, `npm run typecheck` and `npm run build` in each app directory. For the frontends, also run `npm run lint`; use `npm test -- --runInBand` to run frontend tests sequentially.

Backend unit tests run offline with synthetic data and repository stubs. They don't connect to SQL Server or check the deployed schema, and builds don't start the APIs.

For real SQL concurrency checks, start Docker's Linux engine (Docker Desktop on Windows), then run `npm run test:sql` in `assignment/backend`. This runs 22 checks for competing approvals, adjacent and overnight events, venue blocks and rollback, with `READ_COMMITTED_SNAPSHOT` off and on. It uses a disposable, loopback-only SQL Server 2022 Developer container with a 3 GB memory limit, generated credentials and synthetic data, then removes the container. It does not use `.env` credentials or connect to Azure. Its test schema is not a migration baseline.

## Hosting and limitations

The frontends are hosted on Vercel, the APIs on Render, and the database on Azure SQL. Configure backend origins, secrets and database permissions in the hosting environment.

Automatic Git deployments are currently disabled in the Vercel configuration files, so pushing or merging code does not update the hosted frontends. Enable deployments separately when ready.

This is a portfolio demo. A few things to keep in mind:

- Each frontend sends a background health request once per full page load to wake its backend services. It sends no session credentials and stops waiting after 70 seconds. There is no recurring keep-alive, so the first API call can still be slow.
- Authentication includes account-based failed-attempt limits and public API rate limits. Session handling prevents an older login check from overwriting a newer sign-in or sign-out.
- Booking submissions and approvals check availability on the server. Transaction-held venue locks coordinate approvals and unavailable dates. Events use Australia/Sydney wall time, and bookings can start exactly when another ends.
- Local tests cover authentication, booking decisions, session races, document handling and SQL concurrency. Azure schema compatibility and deployed browser flows still need staging checks.
- A reproducible database schema, deployed client-IP verification, a document-access and retention policy, and the booking-completion/history workflow still need work. The app is not ready for production use.

## Credits

Copyright © 2026 RMIT University.

Originally developed for **Full Stack Development, Semester 1, 2026**, by **Dilushi Mirthula Rajendran** and **Azhaanul Haque Farooqui**. The original course lecturer granted permission to publish and self-host the project subject to attribution. This repository does not grant an open-source licence or claim a transfer of copyright.
