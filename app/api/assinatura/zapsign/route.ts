import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ataAprovacaoContas, ataDistribuicao, type MinutaTipo, type SocioQuota,
} from '@/lib/minutas'
import { minutaParaPdf } from '@/lib/minuta-pdf'
import { criarDocumentoZapSign } from '@/lib/zapsign'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Envia a minuta para assinatura via ZapSign, usando o token da PRÓPRIA conta do
// contador (organizations.assinatura_token). Só funciona quando o provedor está
// configurado — caso contrário, o app usa o fluxo manual (Modelo C).
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    holdingId?: string
    tipo?: MinutaTipo
    exercicio?: number
    competencia?: string
    valorTotal?: number
    dataReuniao?: string
    proporcional?: boolean
  }
  const { holdingId, tipo } = body
  if (!holdingId || !tipo) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 })

  // provedor da organização
  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) return NextResponse.json({ erro: 'Escritório não encontrado.' }, { status: 400 })
  const { data: org } = await supabase
    .from('organizations')
    .select('assinatura_provedor, assinatura_token')
    .eq('id', orgId)
    .maybeSingle()
  if (!org || org.assinatura_provedor !== 'zapsign' || !org.assinatura_token) {
    return NextResponse.json(
      { erro: 'Envio automático não configurado. Configure o ZapSign em Configurações ou use o fluxo manual.' },
      { status: 400 },
    )
  }

  // dados da holding + sócios/quotas
  const { data: holding } = await supabase
    .from('holdings').select('razao_social, cnpj, family_id').eq('id', holdingId).maybeSingle()
  if (!holding) return NextResponse.json({ erro: 'Holding não encontrada.' }, { status: 404 })

  const { data: quotas } = await supabase
    .from('quotas').select('socio_id, quantidade, percentual').eq('holding_id', holdingId)
  const socioIds = Array.from(new Set((quotas ?? []).map((q) => q.socio_id)))
  const { data: socios } = socioIds.length
    ? await supabase.from('socios').select('id, nome, email').in('id', socioIds)
    : { data: [] as { id: string; nome: string; email: string | null }[] }
  const socioMap = new Map((socios ?? []).map((s) => [s.id, s]))

  const linhas: (SocioQuota & { email: string | null })[] = (quotas ?? []).map((q) => {
    const s = socioMap.get(q.socio_id)
    return {
      nome: s?.nome ?? 'sócio',
      email: s?.email ?? null,
      percentual: q.percentual,
      quantidade: Number(q.quantidade),
    }
  })
  if (linhas.length === 0) {
    return NextResponse.json({ erro: 'Cadastre sócios e quotas na holding antes de gerar a minuta.' }, { status: 400 })
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const minuta =
    tipo === 'aprovacao-contas'
      ? ataAprovacaoContas(holding, linhas, {
          exercicio: body.exercicio ?? new Date().getFullYear() - 1,
          dataReuniao: body.dataReuniao ?? hoje,
        })
      : ataDistribuicao(holding, linhas, {
          competencia: body.competencia ?? hoje,
          valorTotal: Number(body.valorTotal ?? 0),
          dataReuniao: body.dataReuniao ?? hoje,
          proporcional: body.proporcional ?? true,
        })

  try {
    const pdfBase64 = await minutaParaPdf(minuta)
    const resultado = await criarDocumentoZapSign(org.assinatura_token, {
      nome: `${minuta.titulo} — ${holding.razao_social}`,
      pdfBase64,
      signatarios: linhas.map((l) => ({ name: l.nome, email: l.email })),
    })
    return NextResponse.json({ ok: true, ...resultado })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Falha no envio.' }, { status: 502 })
  }
}
