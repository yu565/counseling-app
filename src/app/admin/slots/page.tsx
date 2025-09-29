// /src/app/admin/slots/page.tsx
import { createServer } from '@/lib/supabase/serverClient';
import { redirect } from 'next/navigation';
import { createSlot, setActive } from './actions'; // ★ 新アクションを使用！

const ADMIN_UID = process.env.ADMIN_UID;

const fmtJST = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });

type Search = { ok?: string; err?: string };

export default async function AdminSlotsPage({ searchParams }: { searchParams?: Search }) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!ADMIN_UID || user.id !== ADMIN_UID) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">枠の作成</h1>
        <p>権限がありません。</p>
      </main>
    );
  }

  // 一覧取得
  const { data: slots, error } = await supabase
    .from('availability_slots')
    .select('id, start_ts, end_ts, is_active')
    .order('start_ts', { ascending: false })
    .limit(100);

  // バナー表示（actions.ts は ?ok=1 / ?err=... を付与）
  const ok = searchParams?.ok === '1';
  const errKey = searchParams?.err;
  const errorText =
    errKey === 'invalid_datetime' ? '日時の形式が不正です。' :
    errKey ? `エラー：${errKey}` :
    null;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">管理：枠の作成</h1>

      {ok && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-green-800">
          枠を作成しました。
        </div>
      )}
      {errorText && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700">
          {errorText}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700">
          取得エラー：{error.message}
        </div>
      )}

      {/* 作成フォーム（★ server action 直呼び） */}
      <form action={createSlot} className="space-y-4 rounded-xl border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm">開始（ローカル時刻）</span>
            <input type="datetime-local" name="start" required className="mt-1 block w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm">終了（ローカル時刻）</span>
            <input type="datetime-local" name="end" required className="mt-1 block w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg border hover:bg-gray-50">
          枠を作成
        </button>
      </form>

      {/* 枠一覧 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">枠一覧</h2>

        {!slots || slots.length === 0 ? (
          <p className="text-gray-500">まだ枠がありません。</p>
        ) : (
          <ul className="space-y-3">
            {slots.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-medium">{fmtJST(s.start_ts)} 〜 {fmtJST(s.end_ts)}</p>
                  <p className="text-sm text-gray-600">状態：{s.is_active ? '有効' : '無効'}</p>
                </div>

                <div className="flex gap-2">
                  {s.is_active ? (
                    <form action={setActive.bind(null, s.id, false)}>
                      <button className="px-3 py-1 rounded-lg border hover:bg-gray-50">無効化</button>
                    </form>
                  ) : (
                    <form action={setActive.bind(null, s.id, true)}>
                      <button className="px-3 py-1 rounded-lg border hover:bg-gray-50">有効化</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-gray-500">
        入力はローカル時刻で受け取り、DBにはUTC（ISO）で保存します。表示はJSTでフォーマットしています。
      </p>
    </main>
  );
}
