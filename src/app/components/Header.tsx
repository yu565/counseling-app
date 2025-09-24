'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowser } from '@/lib/supabase/browserClient';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const supabase = createBrowser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    // 初期取得
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null);
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const displayName = meta.name ?? meta.full_name ?? user?.email ?? '';

  return (
    <header className="border-b">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">Counseling</Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-600 truncate max-w-[180px]">{displayName}</span>
              <Link href="/logout" className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">
                ログアウト
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">
                ログイン
              </Link>
              <Link href="/signup" className="rounded-lg bg-black text-white px-3 py-1 text-sm">
                新規登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
