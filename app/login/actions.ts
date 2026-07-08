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
  const nomeEscritorio = String(formData.get('nome_escritorio') ?? '').trim()
  const ref = String(formData.get('ref') ?? '').trim() || null

  if (!nomeEscritorio) {
    redirect('/login?error=' + encodeURIComponent('Informe o nome do escritório para criar a conta.'))
  }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }
  if (data.session) {
    // confirmação de e-mail desligada: já entra, cria o escritório e vai pro app
    const { error: eOrg } = await supabase.rpc('criar_escritorio', {
      p_nome: nomeEscritorio,
      p_cnpj: null,
      p_crc: null,
      p_ref: ref,
    })
    revalidatePath('/', 'layout')
    // se algo falhar na criação do escritório, cai no onboarding (fallback) já logado
    if (eOrg) redirect('/onboarding?error=' + encodeURIComponent(eOrg.message))
    redirect('/app')
  }
  redirect(
    '/login?message=' +
      encodeURIComponent(
        'Conta criada. Confirme pelo link enviado ao seu e-mail e entre — o escritório será criado em seguida.',
      ),
  )
}
