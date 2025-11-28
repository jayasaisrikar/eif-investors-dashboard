import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../app-factory.js'

let appPromise: Promise<any> | null = null;
let initError: any = null;

async function getApp() {
  if (initError) throw initError;
  if (!appPromise) {
    appPromise = createApp().catch(err => {
      console.error('[api/auth] Failed to create app:', err);
      initError = err;
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    console.log(`[api/auth] ${req.method} ${req.url}`);
    console.log(`[api/auth] JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
    console.log(`[api/auth] SUPABASE_URL exists: ${!!process.env.SUPABASE_URL}`);
    console.log(`[api/auth] NODE_ENV: ${process.env.NODE_ENV}`);
    
    const app = await getApp();
    
    return new Promise<void>((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      setTimeout(resolve, 25000);
      
      app(req, res);
    });
  } catch (error) {
    console.error('[api/auth] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Stack:', errorStack);
    
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        message: 'Server error', 
        error: errorMsg,
        env: process.env.NODE_ENV
      }));
    }
  }
}
