import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { createApp } from "./app";
import { positiveInteger, validateStartupEnvironment } from "./config";

export async function startServer() {
  validateStartupEnvironment();
  const { app, server } = await createApp();
  try { await AppDataSource.initialize(); }
  catch {
    await server.stop();
    throw new Error("Database initialization failed. Check connectivity, TLS, firewall and credentials; details suppressed.");
  }
  const listener = app.listen(positiveInteger("PORT", 3003, 65535), "0.0.0.0");
  listener.on("error", () => { console.error("HTTP listener failed"); process.exitCode = 1; });
  return listener;
}

if (require.main === module) startServer().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
