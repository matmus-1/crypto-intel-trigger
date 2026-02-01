import { createClient } from "@supabase/supabase-js";

// Client for browser/API routes (uses anon key)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client for Trigger.dev jobs (uses service role key)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = createClient<any>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
