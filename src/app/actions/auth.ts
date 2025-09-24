// src/app/actions/auth.ts
'use server';

import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/serverClient';

export async function signOut() {
  const supabase = await createServer(); // ← await 必須
  await supabase.auth.signOut();
  redirect('/login');
}
