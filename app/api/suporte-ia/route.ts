import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { montarSystem } from '@/lib/assistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Chat do assistente (usuário autenticado).
// Body: { conversaId?: string; mensagem: string }
// Fluxo: salva a mensagem do usuário -> monta system (persona + FAQ) ->
// chama a Anthropic -> parse do JSON {resposta, escalar} -> salva a resposta ->
// se escalar, marca a conversa como ticket (escalada + status aberto).

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { conversaId?: string; mensagem?: string }
  const mensagem = (body.mensagem || '').trim()
  if (!mensagem) return NextResponse.json({ erro: 'Escreva a sua dúvida.' }, { status: 400 })
  if (mensagem.length > 2000) {
    return NextResponse.json({ erro: 'Mensagem muito longa (máx. 2000 caracteres).' }, { status: 400 })
  }

  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) return NextResponse.json({ erro: 'Escritório não encontrado.' }, { status: 400 })

  // conversa (continua ou cria)
  let conversaId = body.conversaId || null
  if (conversaId) {
    const { data: existe } = await supabase
      .from('suporte_conversas')
      .select('id')
      .eq('id', conversaId)
      .maybeSingle()
    if (!existe) conversaId = null
  }
  if (!conversaId) {
    const { data: nova, error } = await supabase
      .from('suporte_conversas')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        assunto: mensagem.slice(0, 80),
      })
      .select('id')
      .single()
    if (error || !nova) {
      return NextResponse.json({ erro: error?.message ?? 'Falha ao abrir a conversa.' }, { status: 500 })
    }
    conversaId = nova.id
  }

  // mensagem do usuário
  await supabase.from('suporte_mensagens').insert({
    conversa_id: conversaId,
    autor: 'usuario',
    texto: mensagem,
  })

  // histórico (últimas 12)
  const { data: historico } = await supabase
    .from('suporte_mensagens')
    .select('autor, texto')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true })
    .limit(12)

  // base de conhecimento (FAQ publicada)
  const { data: faq } = await supabase
    .from('faq')
    .select('categoria, pergunta, resposta')
    .eq('publicado', true)
    .order('ordem', { ascending: true })
    .limit(80)
  const baseFaq = (faq ?? [])
    .map((f) => `[${f.categoria}] P: ${f.pergunta}\nR: ${f.resposta}`)
    .join('\n\n')

  // persona/modelo (service role; sem ele, cai na persona padrão)
  let personaCustom: string | null = null
  let modelo: string | undefined
  try {
    const admin = createAdminClient()
    const { data: cfg } = await admin
      .from('assistente_config')
      .select('system_prompt, modelo')
      .eq('id', 1)
      .maybeSingle()
    personaCustom = cfg?.system_prompt ?? null
    modelo = cfg?.modelo ?? undefined
  } catch {
    /* segue com a persona padrão */
  }

  // IA
  let resposta = ''
  let escalar = false
  try {
    const msgs = (historico ?? []).map((m) => ({
      role: (m.autor === 'usuario' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.texto,
    }))
    const bruto = await anthropic(msgs, montarSystem(personaCustom, baseFaq), 1000, modelo)
    const limpo = bruto.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(limpo) as { resposta?: string; escalar?: boolean }
    resposta = (parsed.resposta || '').trim()
    escalar = Boolean(parsed.escalar)
    if (!resposta) throw new Error('Resposta vazia.')
    supabase.rpc('registrar_ia_uso', { p_contexto: 'suporte', p_ok: true }).then(() => {})
  } catch {
    resposta =
      'Não consegui responder agora — vou encaminhar a sua dúvida para a nossa equipe, que retorna por aqui mesmo.'
    escalar = true
    supabase.rpc('registrar_ia_uso', { p_contexto: 'suporte', p_ok: false }).then(() => {})
  }

  // resposta da IA
  await supabase.from('suporte_mensagens').insert({
    conversa_id: conversaId,
    autor: 'ia',
    texto: resposta,
  })

  if (escalar) {
    await supabase
      .from('suporte_conversas')
      .update({ escalada: true, status: 'aberto', atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)
  } else {
    await supabase
      .from('suporte_conversas')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)
  }

  return NextResponse.json({ ok: true, conversaId, resposta, escalar })
}
