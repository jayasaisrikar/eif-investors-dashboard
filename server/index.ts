import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified. Allow HOST config via environment variable
  // and make `reusePort` conditional based on platform because Windows doesn't
  // support SO_REUSEPORT and will cause an ENOTSUP error on listen.
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST ?? (process.platform === "win32" ? "127.0.0.1" : "0.0.0.0");

  const listenOptions: any = { port, host };
  if (process.platform !== "win32") {
    // `reusePort` gives better scalability for clustering on platforms that support it.
    listenOptions.reusePort = true;
  }

  // Add an error handler so the server emits a friendly message and exits cleanly.
  httpServer.on("error", (err: any) => {
    // Log the error with a readable prefix and suggest a fix for ENOTSUP.
    log(`server error: ${err.message}`, "server");
    if (err && err.code === "ENOTSUP") {
      log("Detected ENOTSUP - possibly unsupported socket options on this platform.", "server");
      if (process.platform === "win32") {
        log("On Windows, SO_REUSEPORT is not supported. Consider setting HOST to 127.0.0.1 or removing reusePort.", "server");
      }
    }
    process.exit(1);
  });

  httpServer.listen(listenOptions, () => {
    log(`serving on ${host}:${port}`);
  });
})();
