import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://zbnpdljtffddfymhxumx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibnBkbGp0ZmZkZGZ5bWh4dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzIxNDAsImV4cCI6MjA4MTYwODE0MH0.4LThsV6kp_CI9m7zlxORFHPW5IANiPLtR1O_TkrXmdE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
