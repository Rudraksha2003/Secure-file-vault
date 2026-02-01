import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = typeof window !== 'undefined' && window.__SUPABASE_URL__
const supabaseAnonKey = typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase config missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify env and redeploy so the build generates js/supabaseConfig.generated.js.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
