import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Create and export a single server-side Supabase client instance.
// This project requires Supabase for storage; fail fast if env vars are missing.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)",
  );
}

const supabaseClient: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false },
});

export default supabaseClient;
