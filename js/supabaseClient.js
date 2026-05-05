export const SUPABASE_IS_CONFIGURED =
  window.TSW_SUPABASE_URL &&
  window.TSW_SUPABASE_ANON_KEY &&
  !window.TSW_SUPABASE_URL.includes("YOUR_PROJECT_URL") &&
  !window.TSW_SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");

export const db = SUPABASE_IS_CONFIGURED
  ? window.supabase.createClient(window.TSW_SUPABASE_URL, window.TSW_SUPABASE_ANON_KEY)
  : null;
