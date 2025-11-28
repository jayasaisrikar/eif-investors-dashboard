import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server/app';

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch(err => {
      console.error('Failed to create app:', err);
      appPromise = null; // reset on error so next request tries again
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    console.log(`[API] ${req.method} ${req.url}`);
    const app = await getApp();
    // Express apps are callable as (req,res)
    // @ts-ignore
    return app(req, res);
  } catch (error) {
    console.error('[API Handler Error]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Internal server error', error: String(error) }));
  }
}
