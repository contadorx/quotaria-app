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
  redirect('/app')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }
  redirect(
    '/login?message=' +
      encodeURIComponent(
        'Conta criada. Se a confirmação de e-mail estiver ligada no Supabase, confirme pelo link antes de entrar.',
      ),
  )
}
