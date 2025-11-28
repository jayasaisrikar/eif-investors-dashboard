// This file is in api/ so it gets bundled by Vercel's Node builder
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes.js'

let appInstance: any = null;
let routesRegistered = false;
let routeRegistrationError: any = null;

async function ensureRoutesRegistered(app: any) {
  if (routesRegistered) return;
  if (routeRegistrationError) throw routeRegistrationError;
  
  try {
    console.log('[ensureRoutesRegistered] Registering routes on first request...');
    const httpServer = createServer();
    await registerRoutes(httpServer as any, app as any);
    routesRegistered = true;
    console.log('[ensureRoutesRegistered] Routes registered successfully');
  } catch (error) {
    console.error('[ensureRoutesRegistered] Failed to register routes:', error);
    routeRegistrationError = error;
    throw error;
  }
}

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

    // Middleware to ensure routes are registered before processing requests
    app.use(async (req, res, next) => {
      try {
        await ensureRoutesRegistered(app);
        next();
      } catch (error) {
        console.error('[middleware] Route registration failed:', error);
        res.status(500).json({ 
          message: 'Service initialization failed', 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    console.log('[createApp] App initialized successfully');
    appInstance = app;
    return app;
  } catch (error) {
    console.error('[createApp] Error creating app:', error);
    throw error;
  }
}
