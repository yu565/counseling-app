'use client';

import { createBrowserClient } from '@supabase/ssr';

// ✅ named export にして page.tsx 側と合わせる
export function createBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
