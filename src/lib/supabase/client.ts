'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

// Single shared client for the whole app. @supabase/ssr's browser client
// persists the session in cookies (not localStorage) so it's readable by
// server components/middleware too if you add SSR-protected routes later.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);

