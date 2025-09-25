// /src/app/reservations/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/serverClient';

export async function cancelReservationAction(formData: FormData): Promise<void> {
  const rawId = formData.get('reservationId');
  const reservationId = typeof rawId === 'string' ? rawId : '';

  // パラメータ不正
  if (!reservationId) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  const supabase = await createServer();

  // 認証
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  // 本人の予約のみ取得
  const { data: resv } = await supabase
    .from('reservations')
    .select('id, user_id, status, slot_id')
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .single();

  if (!resv) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  // 未来の枠だけキャンセル可（列名が start* の列を自動検出）
  let canCancel = true;
  if (resv.slot_id) {
    const { data: slotRows } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', resv.slot_id)
      .limit(1);

    const slot = slotRows?.[0] as Record<string, unknown> | undefined; // ← any を使わない
    const startKey = slot ? Object.keys(slot).find(k => k.toLowerCase().includes('start')) : undefined;
    const startRaw = startKey ? slot?.[startKey] : undefined;
    const startIso = typeof startRaw === 'string' ? startRaw : undefined;

    if (startIso) {
      const startTime = Date.parse(startIso);
      if (!Number.isNaN(startTime) && startTime <= Date.now()) {
        canCancel = false; // すでに開始済み
      }
    }
  }

  if (!canCancel) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  // ステータス更新（booked のものだけ）
  await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', resv.id)
    .eq('user_id', user.id)
    .eq('status', 'booked');

  revalidatePath('/reservations');
  redirect('/reservations');
}
