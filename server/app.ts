import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes';

export async function createApp() {
  try {
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
    const httpServer = createServer();
    await registerRoutes(httpServer as any, app as any);

    return app;
  } catch (error) {
    console.error('Error creating app:', error);
    throw error;
  }
}
