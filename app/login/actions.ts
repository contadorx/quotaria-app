'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }
  revalidatePath('/', 'layout')
  redirect('/app') // o layout decide: sem escritório → /onboarding
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }
  if (data.session) {
    // confirmação de e-mail desligada: já entra e configura o escritório
    revalidatePath('/', 'layout')
    redirect('/onboarding')
  }
  redirect(
    '/login?message=' +
      encodeURIComponent(
        'Conta criada. Confirme pelo link enviado ao seu e-mail e entre — a configuração do escritório vem em seguida.',
      ),
  )
}
