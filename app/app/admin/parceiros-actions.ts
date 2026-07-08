'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enviarEmail } from '@/lib/brevo'
import { formatarMoeda } from '@/lib/format'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const compLabel = (iso: string) => { const [y, m] = iso.split('-'); return `${MESES[Number(m) - 1]}/${y}` }
const subst = (tpl: string, c: Record<string, string>) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => c[k] ?? '')

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

// ───────────────────────── Envio real pela Brevo (e-mail transacional)
export async function enviarEmailFatura(formData: FormData) {
  const id = str(formData, 'id')
  const chave = str(formData, 'chave') // solicitar_nf | lembrete | pagamento
  const supabase = createClient()

  const { data: f } = await supabase.from('comissao_faturas')
    .select('id, parceiro_ref, competencia, valor, nf_numero, status').eq('id', id).maybeSingle()
  if (!f) redirect('/app/admin/comissoes?error=' + encodeURIComponent('Fatura não encontrada.'))
  const { data: p } = await supabase.from('parceiros')
    .select('nome, email, documento, chave_pix').eq('ref', f!.parceiro_ref).maybeSingle()
  if (!p?.email) redirect('/app/admin/comissoes?error=' + encodeURIComponent('Parceiro sem e-mail cadastrado (cadastre em Parceiros).'))
  const { data: m } = await supabase.from('comissao_mensagens').select('assunto, corpo').eq('chave', chave).maybeSingle()
  if (!m) redirect('/app/admin/comissoes?error=' + encodeURIComponent('Modelo de e-mail não encontrado.'))

  const campos = {
    nome: p!.nome,
    competencia: compLabel(f!.competencia),
    valor: formatarMoeda(Number(f!.valor)),
    documento: p!.documento ? `${p!.nome} (${p!.documento})` : p!.nome,
    pix: p!.chave_pix ?? '',
    nf_numero: f!.nf_numero ?? '',
  }
  const r = await enviarEmail({ para: p!.email, assunto: subst(m!.assunto, campos), corpoTexto: subst(m!.corpo, campos) })
  if (!r.ok) {
    const msg = r.skipped
      ? 'E-mail não configurado. Defina BREVO_API_KEY e EMAIL_FROM na Vercel — ou use "abrir no e-mail".'
      : ('Falha no envio: ' + (r.erro ?? ''))
    redirect('/app/admin/comissoes?error=' + encodeURIComponent(msg))
  }
  if (chave === 'solicitar_nf' && f!.status === 'a_enviar') {
    await supabase.from('comissao_faturas').update({ status: 'nf_solicitada', solicitada_em: new Date().toISOString() }).eq('id', id)
  }
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('E-mail enviado ao parceiro pela Brevo.'))
}

// ───────────────────────── Régua de comunicação (mensagens editáveis)
export async function salvarReguaComissao(formData: FormData) {
  const supabase = createClient()
  const chaves = ['solicitar_nf', 'lembrete', 'pagamento'] as const
  for (const chave of chaves) {
    const assunto = str(formData, `${chave}_assunto`)
    const corpo = str(formData, `${chave}_corpo`)
    if (!assunto || !corpo) continue
    await supabase.from('comissao_mensagens')
      .update({ assunto, corpo, updated_at: new Date().toISOString() })
      .eq('chave', chave)
  }
  revalidatePath('/app/admin/comissoes')
  redirect('/app/admin/comissoes?message=' + encodeURIComponent('Régua de comunicação atualizada.'))
}
