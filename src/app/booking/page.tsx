'use client';

import { useEffect, useState } from 'react';
import { createBrowser } from '@/lib/supabase/browserClient';

type Slot = {
  id: string;
  start_ts: string;
  end_ts: string;
  note: string | null;
};

const fmtJST = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });

export default function BookingPage() {
  const supabase = createBrowser();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgOk, setMsgOk] = useState<string | null>(null);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 枠の取得：is_active=true かつ start_ts > now
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsgOk(null);
      setMsgErr(null);

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('availability_slots')
        .select('id,start_ts,end_ts,note')
        .eq('is_active', true)
        .gt('start_ts', nowIso) // 未来の枠だけ
        .order('start_ts', { ascending: true });

      if (error) setMsgErr((error as any)?.message ?? '枠一覧の取得に失敗しました');
      else setSlots(data ?? []);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const book = async (slotId: string) => {
    setMsgOk(null);
    setMsgErr(null);
    setBusyId(slotId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsgErr('ログインが必要です'); setBusyId(null); return; }

    // 予約作成（status を明示）
    const { error } = await supabase
      .from('reservations')
      .insert({ slot_id: slotId, user_id: user.id, status: 'booked' });

    if (error) {
      // Supabase の PostgrestError は code を持つので any 経由で安全に参照
      const code = (error as any)?.code as string | undefined;
      if (code === '23505') {
        setMsgErr('この枠はすでに予約されました。更新して確認してください。');
      } else {
        setMsgErr((error as any)?.message ?? '予約に失敗しました');
      }
    } else {
      setMsgOk('予約しました！');
      // 予約済み枠は一覧から消す
      setSlots(prev => prev.filter(s => s.id !== slotId));
    }

    setBusyId(null);
  };

  if (loading) return <div className="p-6">読み込み中...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">空き枠</h1>

      {msgOk && <div className="text-green-600">{msgOk}</div>}
      {msgErr && <div className="text-red-600">{msgErr}</div>}

      <ul className="space-y-3">
        {slots.map(s => (
          <li key={s.id} className="border p-4 rounded">
            <div className="font-medium">
              {fmtJST(s.start_ts)} 〜 {fmtJST(s.end_ts)}
            </div>
            {s.note && <div className="text-sm opacity-70">{s.note}</div>}
            <button
              className="mt-2 px-3 py-1 rounded bg-black text-white disabled:opacity-50"
              onClick={() => book(s.id)}
              disabled={busyId === s.id}
            >
              {busyId === s.id ? '処理中...' : '予約する'}
            </button>
          </li>
        ))}
      </ul>

      {slots.length === 0 && <p className="text-sm text-gray-500">現在、予約可能な枠はありません。</p>}
    </div>
  );
}
