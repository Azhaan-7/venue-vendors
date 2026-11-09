import "reflect-metadata";
import { databaseInitializationError } from "./utils/databaseStartup";
import { AppDataSource } from "./data-source";
import { createApp } from "./app";
import { positiveInteger, validateStartupEnvironment } from "./config";

export async function startServer() {
  validateStartupEnvironment();
  const { app, server } = await createApp();
  try { await AppDataSource.initialize(); }
  catch (error) {
    await server.stop();
    throw databaseInitializationError(error);
  }
  const listener = app.listen(positiveInteger("PORT", 3003, 65535), "0.0.0.0");
  listener.on("error", () => { console.error("HTTP listener failed"); process.exitCode = 1; });
  return listener;
}

if (require.main === module) startServer().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
