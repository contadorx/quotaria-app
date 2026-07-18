import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail } from '@/lib/brevo'
import { pendenciasDaOrg, hashPendencias } from '@/lib/alertas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DIAS_LEMBRETE = 7 // conjunto inalterado: só reenvia depois disso
const MAX_ORGS = 120 // teto por execução (protege o timeout); pagina com ?desde=

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ erro: 'CRON_SECRET não configurado.' }, { status: 503 })
  const auth = req.headers.get('authorization')
  const url = new URL(req.url)
  if (auth !== `Bearer ${secret}` && url.searchParams.get('secret') !== secret) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ erro: 'Service role não configurado.' }, { status: 503 })
  }

  const appUrl = process.env.APP_URL || 'https://app.quotaria.com.br'
  const hoje = hojeISO()
  const seco = url.searchParams.get('dry') === '1' // simula, não envia
  const resumo = { enviados: 0, sem_pendencia: 0, sem_mudanca: 0, pulados: 0, falhas: [] as string[] }

  // e-mail do dono por organização
  const { data: donos } = await admin
    .from('organization_members')
    .select('organization_id, email')
    .eq('role', 'dono')
  const emailDono = new Map<string, string>()
  for (const d of donos ?? []) {
    if (d.email) emailDono.set(d.organization_id as string, d.email as string)
  }

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, nome, alertas_ativos, assinatura_status')
    .in('assinatura_status', ['ativa', 'trial', 'inadimplente'])
    .order('id')
    .limit(MAX_ORGS)

  const { data: envios } = await admin.from('alerta_envios').select('organization_id, ultimo_hash, ultimo_envio')
  const envioDe = new Map((envios ?? []).map((e) => [e.organization_id as string, e]))

  for (const o of orgs ?? []) {
    const para = emailDono.get(o.id as string)
    if (!para || o.alertas_ativos === false) {
      resumo.pulados++
      continue
    }

    let itens
    try {
      itens = await pendenciasDaOrg(admin, o.id as string, hoje)
    } catch (e) {
      resumo.falhas.push(`${o.nome}: ${e instanceof Error ? e.message : 'erro ao apurar'}`)
      continue
    }

    if (itens.length === 0) {
      resumo.sem_pendencia++
      continue
    }

    const hash = hashPendencias(itens)
    const anterior = envioDe.get(o.id as string)
    const mudou = anterior?.ultimo_hash !== hash
    const diasDesde = anterior?.ultimo_envio
      ? (Date.now() - new Date(anterior.ultimo_envio as string).getTime()) / 86400000
      : Infinity
    if (!mudou && diasDesde < DIAS_LEMBRETE) {
      resumo.sem_mudanca++
      continue
    }

    const atrasados = itens.filter((i) => i.atrasado).length
    const linhas = itens.slice(0, 12).map((i) => `• ${i.texto}`).join('\n')
    const excedente = itens.length > 12 ? `\n\n… e mais ${itens.length - 12} item(ns) no painel.` : ''
    const assunto =
      atrasados > 0
        ? `${atrasados} pendência(s) em atraso na sua carteira`
        : `Vencimentos da sua carteira nos próximos dias`

    const corpo = `Olá! Este é o alerta automático do Quotaria.

${atrasados > 0 ? `Há ${atrasados} item(ns) em atraso e ` : 'Há '}${itens.length} item(ns) que precisam da sua atenção:

${linhas}${excedente}

Tratar essas pendências é o que mantém a organização das holdings em dia — e o que a família enxerga no relatório.`

    if (seco) {
      resumo.enviados++
      continue
    }

    const r = await enviarEmail({
      para,
      assunto,
      corpoTexto: corpo,
      botao: { texto: 'Abrir o painel', url: `${appUrl}/app` },
    })
    if (!r?.ok) {
      resumo.falhas.push(`${o.nome}: falha no envio`)
      continue
    }

    await admin.from('alerta_envios').upsert(
      {
        organization_id: o.id as string,
        ultimo_hash: hash,
        ultimo_envio: new Date().toISOString(),
        itens: itens.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' },
    )
    resumo.enviados++
  }

  return NextResponse.json({ ok: true, data: hoje, ...resumo })
}
