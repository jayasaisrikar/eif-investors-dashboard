import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Create and export a single server-side Supabase client instance.
// This project requires Supabase for storage; fail fast if env vars are missing.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

console.log(`[supabase.ts] Initializing: URL=${url ? 'set' : 'MISSING'}, KEY=${key ? 'set' : 'MISSING'}`);

if (!url || !key) {
  const errorMsg = `Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY). Got: url=${!!url}, key=${!!key}`;
  console.error(`[supabase.ts] ${errorMsg}`);
  throw new Error(errorMsg);
}

const supabaseClient: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false },
});

export default supabaseClient;
