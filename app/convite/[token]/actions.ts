'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function aceitarConvite(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) redirect('/login')
  const supabase = createClient()
  const { error } = await supabase.rpc('aceitar_convite', { p_token: token })
  if (error) {
    redirect(`/convite/${token}?error=` + encodeURIComponent(error.message))
  }
  revalidatePath('/', 'layout')
  redirect('/app')
}
