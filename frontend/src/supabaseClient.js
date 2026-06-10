// --- supabaseClient.js ---
// استفاده از پکیج npm به جای CDN برای جلوگیری از خطای Failed to fetch و مشکلات CORS
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-url.supabase.co"; 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

let supabase;

// بررسی صحت متغیرهای محیطی
if (supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://your-project-url.supabase.co") {
    // ایجاد کلاینت با تنظیمات پیش‌فرض بهینه
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
      }
    });
    console.log("Supabase client initialized correctly via npm package.");
} else {
    console.error(
      "FATAL: Supabase URL or Anon Key is missing or is placeholder. " +
      "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY variables are set in Vercel."
    );
    // Mock client برای جلوگیری از کرش کردن برنامه در محیط توسعه بدون متغیرها
    supabase = {
        from: () => ({
            select: () => ({
                order: () => ({
                    range: () => Promise.resolve({ data: [], count: 0, error: { message: "Supabase not configured" } }),
                    limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } })
                }),
                eq: () => ({
                    order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }) })
                }),
                or: () => ({
                    order: () => ({ range: () => Promise.resolve({ data: [], count: 0, error: { message: "Supabase not configured" } }) })
                }),
                gte: () => ({
                    lt: () => ({ order: () => ({ range: () => Promise.resolve({ data: [], count: 0, error: null }) }) }),
                    order: () => ({ range: () => Promise.resolve({ data: [], count: 0, error: null }) })
                }),
                lt: () => ({
                    order: () => ({ range: () => Promise.resolve({ data: [], count: 0, error: null }) })
                })
            })
        }),
        channel: () => ({
            on: () => ({
                subscribe: () => ({}),
            }),
            subscribe: () => ({})
        }),
        removeChannel: () => {}
    };
}

export { supabase };
