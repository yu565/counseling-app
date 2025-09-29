// src/app/reservations/page.tsx
import { createServer } from '@/lib/supabase/serverClient';
import Link from 'next/link';
import { cancelReservationAction } from './actions';

type Slot = { id: string } & Record<string, unknown>;

type ReservationBase = {
  id: string;
  status: 'booked' | 'cancelled' | string;
  created_at: string;
  slot_id: string | null;
};
type ReservationView = ReservationBase & { availability_slots: Slot | null };

// UTCで表示（末尾に " UTC" を付けて明示）
const fmtUTC = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'UTC',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' UTC';

/** 列名が starts_at / start_at / start_time などでも拾えるよう自動検出 */
const pickStartEnd = (s: Slot | null) => {
  if (!s) return { start: null as string | null, end: null as string | null };
  const keys = Object.keys(s);
  const startKey = keys.find((k) => k.toLowerCase().includes('start'));
  const endKey   = keys.find((k) => k.toLowerCase().includes('end'));
  const startVal = startKey ? (s as Record<string, unknown>)[startKey] : undefined;
  const endVal   = endKey   ? (s as Record<string, unknown>)[endKey]   : undefined;
  return {
    start: typeof startVal === 'string' ? startVal : null,
    end:   typeof endVal   === 'string' ? endVal   : null,
  };
};

export default async function ReservationsPage() {
  const supabase = await createServer();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
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

  const { data: resRows, error: resErr } = await supabase
    .from('reservations')
    .select('id,status,created_at,slot_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (resErr) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">自分の予約（UTC）</h1>
        <p className="text-red-600">読み込みに失敗しました：{resErr.message}</p>
      </main>
    );
  }

  const baseReservations = (resRows ?? []) as ReservationBase[];
  if (baseReservations.length === 0) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">自分の予約（UTC）</h1>
        <p>まだ予約はありません。</p>
        <div>
          <Link href="/booking" className="inline-block rounded-xl border px-4 py-2 hover:bg-gray-50">
            空き枠を探す
          </Link>
        </div>
      </main>
    );
  }

  const slotIds = Array.from(new Set(baseReservations.map((r) => r.slot_id).filter(Boolean))) as string[];

  const slotMap = new Map<string, Slot>();
  if (slotIds.length > 0) {
    const { data: slotRows } = await supabase.from('availability_slots').select('*').in('id', slotIds);
    for (const s of (slotRows ?? []) as Slot[]) slotMap.set(s.id, s);
  }

  const reservations: ReservationView[] = baseReservations.map((r) => ({
    ...r,
    availability_slots: r.slot_id ? slotMap.get(r.slot_id) ?? null : null,
  }));

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">自分の予約（UTC）</h1>

      <ul className="space-y-3">
        {reservations.map((r) => {
          const slot = r.availability_slots;
          const { start, end } = pickStartEnd(slot);

          const canCancel =
            r.status === 'booked' && start ? new Date(start).getTime() > Date.now() : false;

          return (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">予約ID: {r.id}</p>
                  <p className="font-medium">
                    {start && end ? `${fmtUTC(start)} 〜 ${fmtUTC(end)}` : '（枠情報なし／列名未一致）'}
                  </p>
                  <p className="text-sm">
                    ステータス：<span className="font-semibold">{r.status}</span>
                  </p>
                  <p className="text-xs text-gray-500">作成：{fmtUTC(r.created_at)}</p>
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
