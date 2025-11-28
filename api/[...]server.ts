import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server/app';

let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  // Express apps are callable as (req,res)
  // @ts-ignore -- types align at runtime
  return app(req, res);
}
