import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from './app-factory.js'

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch(err => {
      console.error('Failed to create app:', err);
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    console.log(`[API Handler] ${req.method} ${req.url}`);
    
    // Timeout after 8 seconds to avoid hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Function timeout: app initialization took too long')), 8000)
    );

    const app = await Promise.race([getApp(), timeoutPromise]);
    
    // Invoke the Express app and wait for the response to be sent
    await new Promise<void>((resolve, reject) => {
      // Set up error handler
      const onError = (err: any) => {
        console.error('Express error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Internal server error' }));
        }
        resolve();
      };

      res.on('error', onError);
      
      // Call the Express app
      app(req, res);
      
      // Wait for finish/close
      res.on('finish', resolve);
      res.on('close', resolve);
      
      // Timeout safety - resolve after 25 seconds (Vercel timeout is 30s)
      setTimeout(resolve, 25000);
    });

    console.log(`[API Handler] Completed ${req.method} ${req.url} with status ${res.statusCode}`);
  } catch (error) {
    console.error('[API Handler Error]', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        message: 'Internal server error', 
        error: errorMsg,
        hasSUPABASE_URL: !!process.env.SUPABASE_URL,
        hasJWT_SECRET: !!process.env.JWT_SECRET
      }));
    }
  }
}
