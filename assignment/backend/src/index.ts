import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { createApp } from "./app";
import { positiveInteger, validateStartupEnvironment } from "./config";

export async function startServer() {
  // Configuration failures name variables only, never their values.
  validateStartupEnvironment();
  const app = createApp();
  try { await AppDataSource.initialize(); }
  catch { throw new Error("Database initialization failed. Check connectivity, TLS, firewall and credentials; details suppressed."); }
  const server = app.listen(positiveInteger("PORT", 3001, 65535), "0.0.0.0");
  server.on("error", () => { console.error("HTTP listener failed"); process.exitCode = 1; });
  return server;
}

if (require.main === module) startServer().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
