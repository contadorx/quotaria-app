import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail } from '@/lib/brevo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Cron diário das réguas (Vercel Cron chama com Authorization: Bearer CRON_SECRET).
// - Cobrança: toques relativos ao proximo_vencimento (status ativa/inadimplente).
// - Comunicação: 'apos_cadastro' (dias desde created_at, enquanto trial) e
//   'apos_ativacao' (dias desde ativada_em, para ativas).
// Idempotente: cada toque registrado em *_envios nunca repete.

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function diasEntre(deISO: string, ateISO: string) {
  const de = new Date(deISO.slice(0, 10) + 'T00:00:00Z').getTime()
  const ate = new Date(ateISO + 'T00:00:00Z').getTime()
  return Math.round((ate - de) / 86400000)
}
function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBr(v: string) {
  const [a, m, d] = v.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
function preencher(texto: string, vars: Record<string, string>) {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '')
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

  const appUrl = process.env.APP_URL || 'https://quotaria.com.br'
  const hoje = hojeISO()
  const resumo = { cobranca: 0, comunicacao: 0, pulados: 0, falhas: [] as string[] }

  // e-mail do dono por organização
  const { data: donos } = await admin
    .from('organization_members')
    .select('organization_id, email')
    .eq('role', 'dono')
  const emailDono = new Map<string, string>()
  for (const d of donos ?? []) {
    if (d.email) emailDono.set(d.organization_id, d.email)
  }

  // ── RÉGUA DE COBRANÇA ──────────────────────────────────────────────────────
  const { data: cobCfg } = await admin.from('cobranca_config').select('ativa').eq('id', 1).maybeSingle()
  if (cobCfg?.ativa) {
    const { data: passos } = await admin
      .from('cobranca_passos')
      .select('id, quando, assunto, corpo, botao_texto')
      .eq('ativo', true)
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, nome, valor_mensal, proximo_vencimento, assinatura_status, fatura_url, fatura_vencimento')
      .in('assinatura_status', ['ativa', 'inadimplente', 'pendente'])
      .eq('is_teste', false)

    for (const o of orgs ?? []) {
      const para = emailDono.get(o.id)
      // referência do vencimento: assinatura ativa usa o próximo vencimento;
      // pendente (1ª fatura ainda não paga) usa o vencimento da fatura gerada.
      const venc = o.proximo_vencimento ?? o.fatura_vencimento
      if (!para || !venc) continue
      const delta = diasEntre(venc, hoje) // hoje - vencimento
      for (const p of passos ?? []) {
        if (p.quando !== delta) continue
        const { error: dup } = await admin.from('cobranca_envios').insert({
          organization_id: o.id,
          vencimento: venc,
          quando: p.quando,
        })
        if (dup) {
          resumo.pulados++
          continue // já enviado (unique) ou falha de insert: não envia
        }
        const vars = {
          nome: o.nome,
          valor: brl(Number(o.valor_mensal)),
          vencimento: dataBr(venc),
        }
        const r = await enviarEmail({
          para,
          assunto: preencher(p.assunto, vars),
          corpoTexto: preencher(p.corpo, vars),
          botao: { texto: p.botao_texto, url: o.fatura_url ?? `${appUrl}/app/configuracoes/assinatura` },
        })
        if (r.ok) resumo.cobranca++
        else {
          resumo.falhas.push(`cobranca ${o.nome}: ${r.erro ?? 'pulado (sem BREVO_API_KEY)'}`)
          // sem envio de verdade: remove o registro para tentar de novo amanhã
          await admin
            .from('cobranca_envios')
            .delete()
            .eq('organization_id', o.id)
            .eq('vencimento', venc)
            .eq('quando', p.quando)
        }
      }
    }
  }

  // ── RÉGUA DE COMUNICAÇÃO ───────────────────────────────────────────────────
  const { data: comCfg } = await admin.from('comunicacao_config').select('ativa').eq('id', 1).maybeSingle()
  if (comCfg?.ativa) {
    const { data: passos } = await admin
      .from('comunicacao_passos')
      .select('id, momento, quando, assunto, corpo')
      .eq('ativo', true)
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, nome, created_at, ativada_em, assinatura_status')
      .eq('is_teste', false)

    for (const o of orgs ?? []) {
      const para = emailDono.get(o.id)
      if (!para) continue
      for (const p of passos ?? []) {
        let base: string | null = null
        if (p.momento === 'apos_cadastro') {
          if (o.assinatura_status !== 'trial') continue // conversão: só no trial
          base = o.created_at
        } else if (p.momento === 'apos_ativacao') {
          if (o.assinatura_status !== 'ativa') continue
          base = o.ativada_em
        }
        if (!base) continue
        if (diasEntre(base, hoje) !== p.quando) continue

        const { error: dup } = await admin.from('comunicacao_envios').insert({
          organization_id: o.id,
          momento: p.momento,
          quando: p.quando,
        })
        if (dup) {
          resumo.pulados++
          continue
        }
        const r = await enviarEmail({
          para,
          assunto: preencher(p.assunto, { nome: o.nome }),
          corpoTexto: preencher(p.corpo, { nome: o.nome }),
          botao: { texto: 'Abrir o Quotaria', url: `${appUrl}/app` },
        })
        if (r.ok) resumo.comunicacao++
        else {
          resumo.falhas.push(`comunicacao ${o.nome}: ${r.erro ?? 'pulado (sem BREVO_API_KEY)'}`)
          await admin
            .from('comunicacao_envios')
            .delete()
            .eq('organization_id', o.id)
            .eq('momento', p.momento)
            .eq('quando', p.quando)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, data: hoje, ...resumo })
}
