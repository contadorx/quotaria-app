'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const orNull = (v: string) => (v ? v : null)

// ───────────────────────── Cadastro de parceiros
export async function salvarParceiro(formData: FormData) {
  const supabase = createClient()
  const id = str(formData, 'id')
  const ref = str(formData, 'ref').toLowerCase()
  const nome = str(formData, 'nome')
  if (!ref || !nome) redirect('/app/admin/parceiros?error=' + encodeURIComponent('Código (ref) e nome são obrigatórios.'))
  const dados = {
    ref,
    nome,
    email: orNull(str(formData, 'email')),
    documento: orNull(str(formData, 'documento')),
    chave_pix: orNull(str(formData, 'chave_pix')),
    ativo: formData.get('ativo') === 'on',
    observacoes: orNull(str(formData, 'observacoes')),
  }
  const { error } = id
    ? await supabase.from('parceiros').update(dados).eq('id', id)
    : await supabase.from('parceiros').insert(dados)
  if (error) {
    const msg = error.message.includes('duplicate') ? 'Já existe um parceiro com esse código (ref).' : error.message
    redirect('/app/admin/parceiros?error=' + encodeURIComponent(msg))
  }
  revalidatePath('/app/admin/parceiros')
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/parceiros?message=' + encodeURIComponent('Parceiro salvo.'))
}

export async function excluirParceiro(formData: FormData) {
  const supabase = createClient()
  await supabase.from('parceiros').delete().eq('id', str(formData, 'id'))
  revalidatePath('/app/admin/parceiros')
  redirect('/app/admin/parceiros?message=' + encodeURIComponent('Parceiro removido.'))
}

// ───────────────────────── Ciclo da NF (faturas de comissão)
export async function gerarFatura(formData: FormData) {
  const supabase = createClient()
  const ref = str(formData, 'parceiro_ref')
  const competencia = str(formData, 'competencia') // YYYY-MM-01
  const valor = Number(str(formData, 'valor').replace(',', '.')) || 0
  if (!ref || !competencia) redirect('/app/admin/comissoes?error=' + encodeURIComponent('Dados da fatura incompletos.'))
  // upsert por (ref, competencia)
  const { data: existente } = await supabase
    .from('comissao_faturas').select('id').eq('parceiro_ref', ref).eq('competencia', competencia).maybeSingle()
  const { error } = existente
    ? await supabase.from('comissao_faturas').update({ valor }).eq('id', existente.id)
    : await supabase.from('comissao_faturas').insert({ parceiro_ref: ref, competencia, valor, status: 'a_enviar' })
  if (error) redirect('/app/admin/comissoes?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('Fatura do mês gerada.'))
}

export async function marcarNfSolicitada(formData: FormData) {
  const supabase = createClient()
  await supabase.from('comissao_faturas')
    .update({ status: 'nf_solicitada', solicitada_em: new Date().toISOString() })
    .eq('id', str(formData, 'id')).eq('status', 'a_enviar')
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('Marcado: NF solicitada.'))
}

export async function marcarNfRecebida(formData: FormData) {
  const supabase = createClient()
  await supabase.from('comissao_faturas').update({
    status: 'nf_recebida',
    recebida_em: new Date().toISOString(),
    nf_numero: orNull(str(formData, 'nf_numero')),
    nf_link: orNull(str(formData, 'nf_link')),
  }).eq('id', str(formData, 'id'))
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('Marcado: NF recebida.'))
}

export async function marcarPaga(formData: FormData) {
  const supabase = createClient()
  await supabase.from('comissao_faturas')
    .update({ status: 'paga', paga_em: new Date().toISOString() })
    .eq('id', str(formData, 'id'))
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('Marcado: comissão paga.'))
}

export async function excluirFatura(formData: FormData) {
  const supabase = createClient()
  await supabase.from('comissao_faturas').delete().eq('id', str(formData, 'id'))
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('Fatura removida.'))
}
