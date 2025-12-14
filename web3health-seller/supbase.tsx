import { createClient } from '@supabase/supabase-js';

// Create a single Supabase client for interacting with your database
export const supabase = createClient(
  'https://jkyctppxygjhsqwmbyvb.supabase.co',
  'sb_publishable_OWMmfekcvRK9GZ6PymjIVA_JELuVTdT'
);