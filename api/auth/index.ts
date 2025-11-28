import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../../server/app';

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch(err => {
      console.error('[api/auth] Failed to create app:', err);
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    
    return new Promise<void>((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      setTimeout(resolve, 25000);
      
      app(req, res);
    });
  } catch (error) {
    console.error('[api/auth] Error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Server error', error: String(error) }));
    }
  }
}
