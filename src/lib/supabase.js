import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pmaakkwxcyzfwzjztwyq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtYWFra3d4Y3l6Znd6anp0d3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzM5OTQsImV4cCI6MjA5NDk0OTk5NH0.hUwfVFkQs7z32t2sWT9UKyTJBv46k6MPAJ50gcg-0x4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)