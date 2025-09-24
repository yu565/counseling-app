// /src/app/reservations/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/serverClient';

/**
 * 予約キャンセル（本人のみ・未来の枠だけ許可）
 * formAction の要件に合わせて Promise<void>（値は返さない）
 */
export async function cancelReservationAction(formData: FormData): Promise<void> {
  const reservationId = String(formData.get('reservationId') ?? '');

  // パラメータ不正なら一覧へ
  if (!reservationId) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  const supabase = await createServer();

  // 認証ユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  // 本人の予約のみ対象
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

  // 未来の枠のみキャンセル可（列名差異に強い判定）
  let canCancel = true;
  if (resv.slot_id) {
    const { data: slotRows } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', resv.slot_id)
      .limit(1);

    const slot = slotRows?.[0] as Record<string, any> | undefined;
    const startKey = slot ? Object.keys(slot).find((k) => k.toLowerCase().includes('start')) : undefined;
    const startIso = startKey ? String(slot![startKey]) : undefined;

    if (startIso) {
      const startTime = new Date(startIso).getTime();
      if (!Number.isNaN(startTime) && startTime <= Date.now()) {
        canCancel = false; // すでに開始済み
      }
    }
  }

  if (!canCancel) {
    revalidatePath('/reservations');
    redirect('/reservations');
  }

  // ステータス更新（念のため booked のものだけ）
  await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', resv.id)
    .eq('user_id', user.id)
    .eq('status', 'booked');

  // 画面更新＆戻る
  revalidatePath('/reservations');
  redirect('/reservations');
}
