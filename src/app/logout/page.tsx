// src/app/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browserClient';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createBrowser();

  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        router.replace('/login');
      }
    })();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-sm text-gray-600">サインアウトしています…</p>
    </div>
  );
}
