import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sendSystemAlertEmail } from "../systemAlertEmail";
import { runAccountDeduplicationSchedule } from "../accountDeduplicationSchedule";
import { runOperationLogRetentionSchedule } from "../operationLogRetentionSchedule";
import { runPasswordChangeReminderSchedule } from "../passwordChangeReminderSchedule";
import { runOverdueBorrowReminderSchedule } from "../overdueBorrowReminderSchedule";
import { runAppsScriptOfflineCommand } from "../gmailOfflineCommand";
import { servePdfCjkFont } from "../pdfFontAsset";
import { servePodcastRssFeed } from "../podcastRssFeed";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.post("/api/scheduled/accountDedup", runAccountDeduplicationSchedule);
  app.post("/api/scheduled/operationLogRetention", runOperationLogRetentionSchedule);
  app.post("/api/scheduled/passwordChangeReminder", runPasswordChangeReminderSchedule);
  app.post("/api/scheduled/overdueBorrowReminder", runOverdueBorrowReminderSchedule);
  app.post("/api/integrations/gmail-offline-command", runAppsScriptOfflineCommand);
  app.get("/api/assets/pdf-cjk-font", servePdfCjkFont);
  app.get("/podcasts/:slug/feed.xml", servePodcastRssFeed);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path, type }) => {
        if (error.code !== "INTERNAL_SERVER_ERROR") return;
        void sendSystemAlertEmail({
          eventKey: `trpc-error:${type}:${path ?? "unknown"}:${error.code}`,
          source: "應用程式 API",
          title: "未預期的系統錯誤",
          summary: `${path ?? "未知程序"} 發生內部伺服器錯誤。`,
          details: [`錯誤訊息：${error.message.slice(0, 500)}`],
        }).catch((alertError) => console.error("[SystemAlertEmail] tRPC error notification failed", alertError));
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((error: unknown, req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "未預期的伺服器錯誤";
    const name = error instanceof Error ? error.name : "UnknownError";
    const path = (req.originalUrl || req.url || "/").split("?")[0].slice(0, 512);
    void sendSystemAlertEmail({
      eventKey: `express-error:${req.method}:${path}:${name}`,
      source: "伺服器請求處理",
      title: "未預期的系統錯誤",
      summary: `${req.method} ${path} 發生 ${name}。`,
      details: [`錯誤訊息：${message.slice(0, 500)}`],
    }).catch((alertError) => console.error("[SystemAlertEmail] Global error notification failed", alertError));
    next(error);
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
