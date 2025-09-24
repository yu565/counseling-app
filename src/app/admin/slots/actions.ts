// /src/app/admin/slots/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/serverClient';

const ADMIN_UID = process.env.ADMIN_UID;

/** 'YYYY-MM-DDTHH:mm' (local) → ISO(UTC) */
function toIso(local: string) {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 管理者が空き枠を作成する */
export async function createSlotAction(formData: FormData): Promise<void> {
  const startLocal = String(formData.get('start') ?? '');
  const endLocal   = String(formData.get('end') ?? '');

  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!ADMIN_UID || user.id !== ADMIN_UID) redirect('/');

  const startIso = toIso(startLocal);
  const endIso   = toIso(endLocal);
  if (!startIso || !endIso) redirect('/admin/slots?error=invalid');
  if (new Date(startIso) >= new Date(endIso)) redirect('/admin/slots?error=range');

  const payload = {
    start_ts: startIso,
    end_ts: endIso,
    counselor_id: user.id,
    is_active: true,
  };

  const { error } = await supabase.from('availability_slots').insert(payload);
  if (error) redirect('/admin/slots?error=insert');

  revalidatePath('/booking');
  revalidatePath('/admin/slots');
  redirect('/admin/slots?ok=1');
}

/** is_active を切り替える（true/false） */
export async function setSlotActiveAction(formData: FormData): Promise<void> {
  const slotId = String(formData.get('slotId') ?? '');
  const active = String(formData.get('active') ?? 'true') === 'true';

  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!ADMIN_UID || user.id !== ADMIN_UID) redirect('/');

  if (!slotId) redirect('/admin/slots?error=param');

  await supabase
    .from('availability_slots')
    .update({ is_active: active })
    .eq('id', slotId);

  revalidatePath('/booking');
  revalidatePath('/admin/slots');
  redirect('/admin/slots');
}
