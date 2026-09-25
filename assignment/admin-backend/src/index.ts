import "reflect-metadata";
import express from "express";
import cors from "cors";
import { json } from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";

import { AppDataSource } from "./data-source";
import { typeDefs, resolvers } from "./schema";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("Admin Data Source has been initialized!");

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    await server.start();

    app.use(
      "/graphql",
      cors<cors.CorsRequest>(),
      json({ limit: "10mb" }),
      expressMiddleware(server)
    );

    app.listen(PORT, () => {
      console.log(`Admin backend is running on port ${PORT}`);
      console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.log("Error during Admin Data Source initialization:", error);
  }
}

startServer();