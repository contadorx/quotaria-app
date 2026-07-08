'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function aceitarConviteAdvogado(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const supabase = createClient()
  const { error } = await supabase.rpc('aceitar_convite_advogado', { p_token: token })
  if (error) redirect(`/parceiro/convite/${token}?error=` + encodeURIComponent(error.message))
  revalidatePath('/parceiro')
  redirect('/parceiro')
}

export async function entrarParceiro(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/parceiro/convite/${token}?error=` + encodeURIComponent('E-mail ou senha inválidos.'))
  redirect(`/parceiro/convite/${token}`)
}

export async function criarContaParceiro(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) redirect(`/parceiro/convite/${token}?error=` + encodeURIComponent(error.message))
  if (data.session) redirect(`/parceiro/convite/${token}`)
  redirect(`/parceiro/convite/${token}?message=` + encodeURIComponent('Conta criada. Confirme pelo link no seu e-mail e volte a este endereço.'))
}

export async function sairParceiro() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Contribuição (nível 'contribuicao')
export async function advogadoCriarClausula(formData: FormData) {
  const holdingId = String(formData.get('holding_id') ?? '')
  const supabase = createClient()
  const { error } = await supabase.rpc('advogado_clausula_criar', {
    p_holding_id: holdingId,
    p_tipo: String(formData.get('tipo') ?? 'outra'),
    p_descricao: String(formData.get('descricao') ?? '') || null,
    p_responsavel: String(formData.get('responsavel') ?? '') || null,
  })
  if (error) redirect('/parceiro?error=' + encodeURIComponent(error.message))
  revalidatePath('/parceiro')
  redirect('/parceiro?message=' + encodeURIComponent('Cláusula registrada.'))
}

export async function advogadoExcluirClausula(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.rpc('advogado_clausula_excluir', { p_id: String(formData.get('id') ?? '') })
  if (error) redirect('/parceiro?error=' + encodeURIComponent(error.message))
  revalidatePath('/parceiro')
  redirect('/parceiro?message=' + encodeURIComponent('Cláusula removida.'))
}
