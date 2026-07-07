import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { asaasFetch } from '@/lib/asaas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reabre o link da fatura pendente (ou a mais recente) da assinatura do escritório.
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

    const { data: orgId } = await supabase.rpc('current_org')
    if (!orgId) return NextResponse.json({ erro: 'Escritório não encontrado.' }, { status: 404 })
    const { data: org } = await supabase
      .from('organizations').select('asaas_subscription_id').eq('id', orgId).maybeSingle()

    const subId = org?.asaas_subscription_id as string | null
    if (!subId) return NextResponse.json({ erro: 'Nenhuma assinatura encontrada.' }, { status: 404 })

    const pend = await asaasFetch<{ data: { invoiceUrl?: string }[] }>(`/subscriptions/${subId}/payments?status=PENDING&limit=1`)
    let invoiceUrl = pend?.data?.[0]?.invoiceUrl ?? null
    if (!invoiceUrl) {
      const ult = await asaasFetch<{ data: { invoiceUrl?: string }[] }>(`/subscriptions/${subId}/payments?limit=1`)
      invoiceUrl = ult?.data?.[0]?.invoiceUrl ?? null
    }
    if (!invoiceUrl) return NextResponse.json({ erro: 'Fatura ainda não disponível.' }, { status: 404 })
    return NextResponse.json({ ok: true, invoiceUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar a fatura.'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
