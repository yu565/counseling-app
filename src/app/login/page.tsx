'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browserClient';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 既にログイン済みならトップへ
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (!error && data.session) {
        router.replace('/');
        router.refresh(); // ← SSR/CSRの不整合対策
      }
    })();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message || 'ログインに失敗しました。');
      return;
    }

    router.replace('/');   // 画面遷移
    router.refresh();      // ← 追加：ヘッダーなどサーバー側の再描画
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">ログイン</h1>

        {err && (
          <p className="mb-3 text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded">
            {err}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              className="w-full rounded border px-3 py-2 outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              className="w-full rounded border px-3 py-2 outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
          >
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <p className="text-sm mt-4">
          アカウント未作成の方は <a href="/signup" className="underline">新規登録</a>
        </p>
      </div>
    </div>
  );
}
