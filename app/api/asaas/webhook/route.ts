import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { proximoVencimento, type Ciclo } from '@/lib/asaas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Webhook do Asaas (assinaturas do Quotaria).
// Configure no painel do Asaas apontando para /api/asaas/webhook e defina o
// token de autenticação — o mesmo valor vai em ASAAS_WEBHOOK_TOKEN no Vercel.
// Eventos tratados:
//   PAYMENT_CONFIRMED / PAYMENT_RECEIVED -> assinatura ativa + próximo vencimento
//   PAYMENT_OVERDUE                      -> inadimplente (se estava ativa)

type Payload = {
  event?: string
  payment?: {
    id?: string
    customer?: string
    subscription?: string
    dueDate?: string
    value?: number
    invoiceUrl?: string
    bankSlipUrl?: string
  }
}

export async function POST(req: Request) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN
  if (!esperado) {
    return NextResponse.json({ erro: 'ASAAS_WEBHOOK_TOKEN não configurado.' }, { status: 503 })
  }
  const recebido = req.headers.get('asaas-access-token')
  if (recebido !== esperado) {
    return NextResponse.json({ erro: 'Token inválido.' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Payload
  const evento = body.event || ''
  const pg = body.payment
  if (!pg || (!pg.subscription && !pg.customer)) {
    // evento sem vínculo identificável: aceita sem agir (evita retries do Asaas)
    return NextResponse.json({ ok: true, ignorado: true })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ erro: 'Service role não configurado.' }, { status: 503 })
  }

  // localiza a organização: primeiro pela assinatura, depois pelo cliente
  let org: { id: string; ciclo_cobranca: string; assinatura_status: string; ativada_em: string | null } | null = null
  if (pg.subscription) {
    const { data } = await admin
      .from('organizations')
      .select('id, ciclo_cobranca, assinatura_status, ativada_em')
      .eq('asaas_subscription_id', pg.subscription)
      .maybeSingle()
    org = data
  }
  if (!org && pg.customer) {
    const { data } = await admin
      .from('organizations')
      .select('id, ciclo_cobranca, assinatura_status, ativada_em')
      .eq('asaas_customer_id', pg.customer)
      .maybeSingle()
    org = data
  }
  if (!org) return NextResponse.json({ ok: true, ignorado: true, motivo: 'org não localizada' })

  if (evento === 'PAYMENT_CREATED' || evento === 'PAYMENT_UPDATED') {
    // Asaas gerou/atualizou a fatura: guardamos na org para o aviso no app,
    // o botão "pagar" das réguas e a central de faturas. Não mexe no status
    // (uma assinatura ativa continua ativa até vencer/pagar).
    const { error } = await admin
      .from('organizations')
      .update({
        fatura_url: pg.invoiceUrl ?? pg.bankSlipUrl ?? null,
        fatura_valor: pg.value ?? null,
        fatura_vencimento: pg.dueDate ?? null,
      })
      .eq('id', org.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, acao: 'fatura_guardada' })
  }

  if (evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED') {
    const base = pg.dueDate || new Date().toISOString().slice(0, 10)
    const prox = proximoVencimento(base, (org.ciclo_cobranca as Ciclo) || 'mensal')
    const { error } = await admin
      .from('organizations')
      .update({
        assinatura_status: 'ativa',
        proximo_vencimento: prox,
        ativada_em: org.ativada_em ?? new Date().toISOString(),
        fatura_url: null,
        fatura_valor: null,
        fatura_vencimento: null,
      })
      .eq('id', org.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, acao: 'ativada', proximo_vencimento: prox })
  }

  if (evento === 'PAYMENT_OVERDUE') {
    if (org.assinatura_status === 'ativa') {
      const { error } = await admin
        .from('organizations')
        .update({ assinatura_status: 'inadimplente' })
        .eq('id', org.id)
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, acao: 'inadimplente' })
    }
    return NextResponse.json({ ok: true, ignorado: true, motivo: 'status atual não é ativa' })
  }

  return NextResponse.json({ ok: true, ignorado: true, motivo: 'evento não tratado' })
}
