import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://zbnpdljtffddfymhxumx.supabase.co";
export const SUPABASE_ANON_KEY = "PASTA_ANON_KEY_TÄHÄN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
