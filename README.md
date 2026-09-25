# Assignment 2 – Venue Vendor (VV)

[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23768257&assignment_repo_type=AssignmentRepo)

## Team Members

* Dilushi Mirthula Rajendran – s4136532
* Azhaanul Haque Farooqui – s4149471

## GitHub Repository

https://github.com/rmit-fsd-2026-s1/a2-fsd-pra01-02-wed-6-30pm-alex-team10

---

# Deployment Links

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

* Node.js
* npm
* Microsoft SQL Server database access

---

## VV Backend


```bash
cd assignment/backend
npm install
npm run build
npm start
```

Create a `.env` file inside `assignment/backend`:

```env
DB_HOST=<database-host>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>
```

Backend URL:

```text
http://localhost:3001
```

---

## VV Frontend



```bash
cd assignment/frontend
npm install
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
npm install
npm run build
npm start
```

Create a `.env` file inside `assignment/admin-backend`:

```env
DB_HOST=<database-host>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>
```

GraphQL endpoint:

```text
http://localhost:3003/graphql
```

---

## Admin Frontend


```bash
cd assignment/admin-frontend
npm install
npm run dev
```

Create a `.env.local` file inside `assignment/admin-frontend`:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3003/graphql
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

All generated suggestions were reviewed, modified, tested and integrated by the us before inclusion in the final submission.
