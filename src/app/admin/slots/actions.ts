// /src/app/admin/slots/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/serverClient';

/** datetime-local などローカル時刻文字列 → UTC ISO へ正規化 */
function toIsoUtc(input: FormDataEntryValue | null): string | null {
  const s = (input ?? '').toString().trim();
  if (!s) return null;
  // 'YYYY-MM-DD HH:mm' でも来たら 'T' に寄せる
  const normalized = s.replace(' ', 'T');
  const d = new Date(normalized); // ローカルタイムとして解釈
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString(); // UTC (Z) に変換
}

/** 管理者クライアント取得（未ログイン/権限なしはリダイレクト） */
async function getAdminClient() {
  // import 先は必ず '@/lib/supabase/serverClient'
  const supabase = await createServer(); // 返り値が Promise でも同期でも安全
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');

  const adminUid = process.env.ADMIN_UID;
  if (!adminUid || data.user.id !== adminUid) {
    redirect('/'); // 権限なし
  }
  return { supabase, user: data.user };
}

/** 枠の作成（開始/終了はローカル入力 → UTC ISO で保存） */
export async function createSlot(formData: FormData) {
  const { supabase, user } = await getAdminClient();

  const startIso = toIsoUtc(formData.get('start')); // ex: '2025-09-29T02:40:00.000Z'
  const endIso = toIsoUtc(formData.get('end'));     // ex: '2025-09-29T03:10:00.000Z'
  if (!startIso || !endIso) {
    redirect('/admin/slots?err=invalid_datetime');
  }

  const { error } = await supabase
    .from('availability_slots')
    .insert([
      {
        start_ts: startIso,
        end_ts: endIso,
        is_active: false,      // 作成時は無効 → 後で有効化
        counselor_id: user.id, // 管理ユーザー
      },
    ]);

  if (error) {
    redirect(`/admin/slots?err=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/booking');
  revalidatePath('/admin/slots');
  redirect('/admin/slots');
}

/** 有効/無効の切り替え */
export async function setActive(slotId: string, isActive: boolean) {
  const { supabase } = await getAdminClient();

  const { error } = await supabase
    .from('availability_slots')
    .update({ is_active: isActive })
    .eq('id', slotId);

  if (error) {
    redirect(`/admin/slots?err=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/booking');
  revalidatePath('/admin/slots');
}

/** 枠の削除（必要なら使用） */
export async function deleteSlot(slotId: string) {
  const { supabase } = await getAdminClient();

  const { error } = await supabase
    .from('availability_slots')
    .delete()
    .eq('id', slotId);

  if (error) {
    redirect(`/admin/slots?err=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/booking');
  revalidatePath('/admin/slots');
}
