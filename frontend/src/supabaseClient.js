// frontend/src/supabaseClient.jsx
import { createClient } from '@supabase/supabase-js'

// Read public keys from .env.local or Vercel environment variables (MUST be prefixed with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// [DEBUG] Log the variables to ensure they are loaded correctly
console.log("Supabase URL:", supabaseUrl ? "Loaded" : "MISSING!");
console.log("Supabase Anon Key:", supabaseAnonKey ? "Loaded" : "MISSING!");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "FATAL: Supabase URL or Anon Key is missing. " +
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel Environment Variables."
  );
  // Optionally throw an error or return a dummy client
  // throw new Error("Supabase configuration is missing.");
}

// Export the Supabase client, even if keys are missing initially,
// so the app doesn't crash immediately. The components will handle the error.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
