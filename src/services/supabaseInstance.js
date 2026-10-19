import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/services/supabaseClient";

// The one Supabase client. Imported only through getSupabase()
// (supabaseClient.js), so supabase-js stays out of the entry bundle.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
