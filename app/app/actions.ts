'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TipoSocietario } from '@/lib/database.types'

export async function signout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function createFamily(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) {
    redirect('/app?error=' + encodeURIComponent('Informe o nome da família.'))
  }

  const supabase = createClient()
  // accountant_id é preenchido pelo default auth.uid() no banco.
  const { error } = await supabase.from('families').insert({ name })
  if (error) {
    redirect('/app?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/app')
  redirect('/app')
}

export async function createHolding(formData: FormData) {
  const familyId = String(formData.get('family_id') ?? '')
  const razaoSocial = String(formData.get('razao_social') ?? '').trim()
  const tipoSocietario = String(formData.get('tipo_societario') ?? 'ltda') as TipoSocietario
  const cnpj = String(formData.get('cnpj') ?? '').trim() || null

  if (!familyId) redirect('/app')
  if (!razaoSocial) {
    redirect(
      `/app/familias/${familyId}?error=` +
        encodeURIComponent('Informe a razão social.'),
    )
  }

  const supabase = createClient()
  const { error } = await supabase.from('holdings').insert({
    family_id: familyId,
    razao_social: razaoSocial,
    tipo_societario: tipoSocietario,
    cnpj,
  })
  if (error) {
    redirect(
      `/app/familias/${familyId}?error=` + encodeURIComponent(error.message),
    )
  }

  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}`)
}
