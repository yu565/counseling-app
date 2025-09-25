// /src/app/reservations/page.tsx
import { createServer } from '@/lib/supabase/serverClient';
import Link from 'next/link';
import { cancelReservationAction } from './actions';

type SlotRow = { id: string } & Record<string, unknown>;

type ReservationBase = {
  id: string;
  status: 'booked' | 'cancelled' | string;
  created_at: string;
  slot_id: string | null;
};

type ReservationView = ReservationBase & { availability_slots: SlotRow | null };

const formatJST = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });

/** 列名が starts_at / start_at / start_time などでも拾えるよう自動検出（any不使用） */
const pickStartEnd = (s: Record<string, unknown> | null) => {
  const toIsoString = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (v instanceof Date) return v.toISOString();
    // 文字列化（DBの型がstring想定なので基本ここには来ない）
    return String(v);
  };

  if (!s) return { start: null as string | null, end: null as string | null };

  const keys = Object.keys(s);
  const startKey = keys.find((k) => k.toLowerCase().includes('start'));
  const endKey = keys.find((k) => k.toLowerCase().includes('end'));

  return {
    start: startKey ? toIsoString(s[startKey]) : null,
    end: endKey ? toIsoString(s[endKey]) : null,
  };
};

export default async function ReservationsPage() {
  const supabase = await createServer();

  // 1) ユーザー確認
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">ユーザー情報の取得に失敗しました：{userErr.message}</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p>ログインしてください。</p>
      </main>
    );
  }

  // 2) 自分の予約（最小列のみ）
  const { data: resRows, error: resErr } = await supabase
    .from('reservations')
    .select('id,status,created_at,slot_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (resErr) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">自分の予約</h1>
        <p className="text-red-600">読み込みに失敗しました：{resErr.message}</p>
      </main>
    );
  }

  const baseReservations = (resRows ?? []) as ReservationBase[];

  if (baseReservations.length === 0) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">自分の予約</h1>
        <p>まだ予約はありません。</p>
        <div>
          <Link href="/booking" className="inline-block rounded-xl border px-4 py-2 hover:bg-gray-50">
            空き枠を探す
          </Link>
        </div>
      </main>
    );
  }

  // 3) 関連する枠を一括取得（列名差異に強いように * で取得）
  const slotIds = Array.from(new Set(baseReservations.map((r) => r.slot_id).filter(Boolean))) as string[];

  const slotMap = new Map<string, SlotRow>();
  if (slotIds.length > 0) {
    const { data: slotRows } = await supabase.from('availability_slots').select('*').in('id', slotIds);
    for (const s of slotRows ?? []) {
      const row = s as SlotRow;
      if (typeof row.id === 'string') slotMap.set(row.id, row);
    }
  }

  const reservations: ReservationView[] = baseReservations.map((r) => ({
    ...r,
    availability_slots: r.slot_id ? slotMap.get(r.slot_id) ?? null : null,
  }));

  // 4) 表示
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">自分の予約</h1>

      <ul className="space-y-3">
        {reservations.map((r) => {
          const slot = r.availability_slots;
          const { start, end } = pickStartEnd(slot);

          // 未来の予約だけキャンセル可
          const canCancel = r.status === 'booked' && !!start && new Date(start).getTime() > Date.now();

          return (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">予約ID: {r.id}</p>
                  <p className="font-medium">
                    {start && end ? `${formatJST(start)} 〜 ${formatJST(end)}` : '（枠情報なし／列名未一致）'}
                  </p>
                  <p className="text-sm">
                    ステータス：<span className="font-semibold">{r.status}</span>
                  </p>
                  <p className="text-xs text-gray-500">作成：{formatJST(r.created_at)}</p>
                </div>

                {canCancel ? (
                  <form action={cancelReservationAction} method="post">
                    <input type="hidden" name="reservationId" value={r.id} />
                    <button type="submit" className="px-3 py-1 rounded-lg border hover:bg-gray-50">
                      キャンセル
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
