'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function criarEscritorio(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim()
  if (!nome) {
    redirect('/onboarding?error=' + encodeURIComponent('Informe o nome do escritório.'))
  }
  const supabase = createClient()
  const { error } = await supabase.rpc('criar_escritorio', {
    p_nome: nome,
    p_cnpj: String(formData.get('cnpj') ?? '').trim() || null,
    p_crc: String(formData.get('crc') ?? '').trim() || null,
  })
  if (error) {
    redirect('/onboarding?error=' + encodeURIComponent(error.message))
  }
  revalidatePath('/', 'layout')
  redirect('/app')
}
