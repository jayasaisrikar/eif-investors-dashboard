// This file is in api/ so it gets bundled by Vercel's Node builder
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes.js'

let appInstance: any = null;

export async function createApp() {
  if (appInstance) return appInstance;
  
  try {
    console.log('[createApp] Initializing Express app...');
    const app = express();

    // preserve rawBody behavior used by some routes
    app.use(
      express.json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      }),
    );

    app.use(express.urlencoded({ extended: false }));

    // simple API request logger for /api routes
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      // @ts-ignore
      res.json = function (bodyJson: any, ...args: any[]) {
        capturedJsonResponse = bodyJson;
        // @ts-ignore
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on('finish', () => {
        const duration = Date.now() - start;
        if (path.startsWith('/api')) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          console.log(logLine);
        }
      });

      next();
    });

    // register routes (pass an http server instance)
    // NOTE: don't await registration to reduce cold-start latency in serverless environments.
    // registerRoutes performs only route wiring; any heavy work inside handlers runs per-request.
    const httpServer = createServer();
    console.log('[createApp] Registering routes (async, not blocking)...');
    registerRoutes(httpServer as any, app as any).catch((err) => {
      console.error('[createApp] registerRoutes failed:', err);
    });

    console.log('[createApp] App initialized successfully');
    appInstance = app;
    return app;
  } catch (error) {
    console.error('[createApp] Error creating app:', error);
    throw error;
  }
}
