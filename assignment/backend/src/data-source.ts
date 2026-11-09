import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Profile } from "./entity/Profile";
import { Venue } from "./entity/Venue";
import { VenueSuitability } from "./entity/VenueSuitability";
import { Application } from "./entity/Application";
import { ApplicationVenue } from "./entity/ApplicationVenue";
import { UploadedDocument } from "./entity/UploadedDocument";
import { BlockedPeriod } from "./entity/BlockedPeriod";
import { Comment } from "./entity/Comment";
import { Review } from "./entity/Review";
import { HireHistory } from "./entity/HireHistory";
import { HirerDocument } from "./entity/HirerDocument";
import { ApplicationDraft } from "./entity/ApplicationDraft";
import { ApplicationDraftVenue } from "./entity/ApplicationDraftVenue";
import "dotenv/config";


// The driver retries Azure's transient login errors (including paused DB 40613).
// Keep retries bounded and spaced to allow serverless resume without a retry loop.
const sqlOptions = {
  encrypt: true,
  trustServerCertificate: false,
  maxRetriesOnTransientErrors: 6,
  connectionRetryInterval: 10000,
};

export const AppDataSource = new DataSource({
  type: "mssql",
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: sqlOptions,
  // Schema changes require a reviewed migration; neither runtime owns DDL.
  synchronize: false,
  migrationsRun: false,
  dropSchema: false,
  logging: false,
  invalidWhereValuesBehavior: { null: "throw", undefined: "throw" },
  connectionTimeout: 60000,
  requestTimeout: 15000,
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  entities: [User, Profile, Venue, VenueSuitability, Application, ApplicationVenue, UploadedDocument, BlockedPeriod, Comment, Review, HireHistory, HirerDocument, ApplicationDraft, ApplicationDraftVenue],
  migrations: [],
  subscribers: [],
});
