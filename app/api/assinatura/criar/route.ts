import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { asaasFetch, cicloAsaas, hojeISO, type Ciclo } from '@/lib/asaas'
import { planoPorId, precoCiclo, type PlanoId } from '@/lib/planos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cria (ou atualiza) a assinatura recorrente do escritório no Asaas e devolve o
// link da primeira fatura. O status vai para 'pendente' (via RPC security definer)
// e o webhook do Asaas confirma 'ativa' quando o pagamento entra.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      plano?: PlanoId
      ciclo?: Ciclo
      cpfCnpj?: string
      billingType?: string
      cupom?: string
    }
    const plano = planoPorId(String(body.plano ?? ''))
    if (!plano) return NextResponse.json({ erro: 'Selecione um plano.' }, { status: 400 })
    const ciclo: Ciclo = body.ciclo === 'anual' || body.ciclo === 'semestral' ? body.ciclo : 'mensal'
    const cpfCnpj = (body.cpfCnpj || '').replace(/\D/g, '')
    const billingType = body.billingType || 'UNDEFINED'
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return NextResponse.json({ erro: 'Informe um CPF ou CNPJ válido.' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

    const { data: orgId } = await supabase.rpc('current_org')
    if (!orgId) return NextResponse.json({ erro: 'Escritório não encontrado.' }, { status: 404 })
    const { data: org } = await supabase
      .from('organizations')
      .select('nome, asaas_customer_id, asaas_subscription_id')
      .eq('id', orgId)
      .maybeSingle()
    if (!org) return NextResponse.json({ erro: 'Escritório não encontrado.' }, { status: 404 })

    const { valorCiclo, valorMensalEquivalente } = precoCiclo(plano.valor, ciclo)
    const descricao = `Quotaria ${plano.nome} · ${ciclo}`

    // Cupom (opcional) — vale para o plano mensal; desconta por N meses (ou sempre).
    const cupomCodigo = (body.cupom || '').trim()
    let valorCicloFinal = valorCiclo
    let valorMensalFinal = valorMensalEquivalente
    let cupomAplicado: { codigo: string; meses: number } | null = null
    if (cupomCodigo) {
      if (ciclo !== 'mensal') {
        return NextResponse.json({ erro: 'O cupom vale para o plano mensal.' }, { status: 400 })
      }
      const { data: cup } = await supabase.rpc('validar_cupom', { p_codigo: cupomCodigo })
      const c = Array.isArray(cup) ? cup[0] : null
      if (!c) return NextResponse.json({ erro: 'Cupom inválido ou expirado.' }, { status: 400 })
      const desc = c.tipo === 'percentual' ? (valorCiclo * Number(c.valor)) / 100 : Number(c.valor)
      valorCicloFinal = Math.max(0, Math.round((valorCiclo - desc) * 100) / 100)
      valorMensalFinal = valorCicloFinal
      cupomAplicado = { codigo: c.codigo, meses: c.duracao_meses ?? -1 } // -1 = para sempre
    }

    // 1) Cliente no Asaas (reaproveita se já existir)
    let customerId = org.asaas_customer_id as string | null
    if (!customerId) {
      const cliente = await asaasFetch<{ id: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: org.nome || 'Escritório Quotaria',
          cpfCnpj,
          email: user.email || undefined,
          notificationDisabled: true, // só a régua do Quotaria avisa; o Asaas fica quieto
        }),
      })
      customerId = cliente.id
    }

    // 2) Assinatura recorrente — atualiza se já existe, senão cria
    let subId = org.asaas_subscription_id as string | null
    if (subId) {
      await asaasFetch(`/subscriptions/${subId}`, {
        method: 'PUT',
        body: JSON.stringify({ billingType, value: valorCicloFinal, cycle: cicloAsaas(ciclo), description: descricao }),
      })
    } else {
      const assinatura = await asaasFetch<{ id: string }>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value: valorCicloFinal,
          nextDueDate: hojeISO(),
          cycle: cicloAsaas(ciclo),
          description: descricao,
        }),
      })
      subId = assinatura.id
    }

    // 3) Link da primeira fatura (para pagar agora)
    let invoiceUrl: string | null = null
    try {
      const pgs = await asaasFetch<{ data: { invoiceUrl?: string }[] }>(`/subscriptions/${subId}/payments?limit=1`)
      invoiceUrl = pgs?.data?.[0]?.invoiceUrl ?? null
    } catch {
      /* a fatura pode levar instantes para aparecer; reabrir depois em /fatura */
    }

    // 4) Persiste no escritório via RPC (security definer)
    const { error: rpcErr } = await supabase.rpc('registrar_assinatura_selecionada', {
      p_asaas_customer: customerId,
      p_asaas_subscription: subId,
      p_plano: plano.id,
      p_valor: valorMensalFinal,
      p_ciclo: ciclo,
    })
    if (rpcErr) return NextResponse.json({ erro: rpcErr.message }, { status: 500 })

    // Grava o cupom na org (valor cheio p/ reverter ao fim) e conta o uso.
    if (cupomAplicado) {
      await supabase.rpc('aplicar_cupom_org', {
        p_codigo: cupomAplicado.codigo,
        p_valor_cheio: valorMensalEquivalente,
        p_meses: cupomAplicado.meses,
      })
      await supabase.rpc('registrar_uso_cupom', { p_codigo: cupomAplicado.codigo })
    }

    return NextResponse.json({ ok: true, invoiceUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar a assinatura.'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
