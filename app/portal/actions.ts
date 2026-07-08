'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function aceitarConvite(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const supabase = createClient()
  const { error } = await supabase.rpc('aceitar_convite_familia', { p_token: token })
  if (error) {
    redirect(`/portal/convite/${token}?error=` + encodeURIComponent(error.message))
  }
  revalidatePath('/portal')
  redirect('/portal')
}

export async function entrarPortal(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(`/portal/convite/${token}?error=` + encodeURIComponent('E-mail ou senha inválidos.'))
  }
  redirect(`/portal/convite/${token}`)
}

export async function criarContaPortal(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect(`/portal/convite/${token}?error=` + encodeURIComponent(error.message))
  }
  if (data.session) {
    redirect(`/portal/convite/${token}`)
  }
  redirect(`/portal/convite/${token}?message=` + encodeURIComponent('Conta criada. Confirme pelo link no seu e-mail e volte a este endereço para acessar.'))
}

export async function sairPortal() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
