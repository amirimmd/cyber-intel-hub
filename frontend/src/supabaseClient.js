    // frontend/src/supabaseClient.js
    import { createClient } from '@supabase/supabase-js'
    
    // Read public keys from .env.local (MUST be prefixed with VITE_)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key is missing. Make sure to create a .env.local file.");
    }
    
    export const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
