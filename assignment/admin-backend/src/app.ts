import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { expressMiddleware } from "@as-integrations/express4";
import { typeDefs, resolvers } from "./schema";
import { buildGraphQLContext, GraphQLContext, requireAdmin } from "./auth/context";
import { frontendOrigins } from "./config";
import { configureHttp, originGuard, publicLimits, safeErrorHandler } from "./security/http";
import { operationLimits } from "./security/graphql";

export async function createApp() {
  const app = express();
  const origins = frontendOrigins("ADMIN_FRONTEND_ORIGINS", "http://localhost:3002");
  configureHttp(app);
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  const server = new ApolloServer<GraphQLContext>({
    typeDefs, resolvers,
    csrfPrevention: true,
    introspection: process.env.NODE_ENV !== "production",
    allowBatchedHttpRequests: false,
    includeStacktraceInErrorResponses: false,
    parseOptions: { maxTokens: 2000 },
    validationRules: [operationLimits()],
    plugins: [ApolloServerPluginLandingPageDisabled()],
    formatError(error) {
      if (error.extensions?.code === "INTERNAL_SERVER_ERROR") return { message: "An internal error occurred", extensions: { code: "INTERNAL_SERVER_ERROR" } };
      return error;
    },
  });
  await server.start();
  app.use("/graphql", ...publicLimits(), originGuard(origins), cors({ credentials: true, origin: origins }),
    express.json({ limit: "64kb", inflate: false }),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const context = buildGraphQLContext(req.headers.cookie);
        requireAdmin(context);
        return context;
      },
    }));
  app.use((_req, res) => res.status(404).json({ message: "Not found" }));
  app.use(safeErrorHandler);
  return { app, server };
}
