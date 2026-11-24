import { createClient } from '@supabase/supabase-js'

// These are public browser credentials. Never place a Supabase service-role
// key in this file or in any VITE_ environment variable.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pzdcjjvwjzyjjkygliat.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xCLhcxoLn2J3u-TVWPCPpA_C47nq2_W'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
export const isSupabaseConfigured = true
