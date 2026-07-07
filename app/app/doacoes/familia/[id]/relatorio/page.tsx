import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, formatarMoeda, CLAUSULAS_DOACAO, EXECUCAO_DOACAO } from '@/lib/format'
import { PrintButton } from '@/components/print-button'

export default async function RelatorioDoacoes({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { ano?: string; itcmd?: string; inv?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: orgId } = await supabase.rpc('current_org')
  const { data: org } = await supabase
    .from('organizations').select('nome, logo_url, cor_primaria').eq('id', orgId ?? '').maybeSingle()
  const corMarca = org?.cor_primaria ?? undefined

  const { data: family } = await supabase.from('families').select('id, name').eq('id', params.id).single()
  if (!family) notFound()

  const ano = Number(searchParams.ano) || new Date().getFullYear()
  const itcmdPct = Number(searchParams.itcmd) || 4
  const invPct = Number(searchParams.inv) || 12
  const hojeISO = new Date().toISOString().slice(0, 10)

  const { data: holdings } = await supabase.from('holdings').select('id, razao_social').eq('family_id', params.id)
  const holdingIds = (holdings ?? []).map((h) => h.id)
  const { data: socios } = await supabase.from('socios').select('id, nome').eq('family_id', params.id)
  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const nomeHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))

  const { data: contatos } = await supabase
    .from('family_contacts').select('email').eq('family_id', params.id).eq('receber_relatorio', true)
  const emailsFamilia = (contatos ?? []).map((c) => c.email).filter(Boolean).join(',')

  const doacoes = holdingIds.length
    ? (await supabase
        .from('doacoes')
        .select('holding_id, doador_id, donatario_id, quantidade_quotas, valor_estimado, itcmd_estimado, data_conclusao, data_prevista, status, cartorio, com_reserva_usufruto, clausula_incomunicabilidade, clausula_impenhorabilidade, clausula_inalienabilidade, clausula_reversao, minuta_solicitada, guia_itcmd_paga, escritura_lavrada, registro_concluido, adiada_em, adiada_motivo')
        .in('holding_id', holdingIds)).data ?? []
    : []

  const concluidas = doacoes.filter((d) => d.status === 'concluida')
  const doAno = concluidas.filter((d) => d.data_conclusao?.slice(0, 4) === String(ano))
  const transferidoAno = doAno.reduce((a, d) => a + Number(d.valor_estimado ?? 0), 0)
  const itcmdAno = doAno.reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)
  const transferidoAcum = concluidas.reduce((a, d) => a + Number(d.valor_estimado ?? 0), 0)
  const itcmdAcum = concluidas.reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)
  const custoEvitado = Math.max(0, (transferidoAcum * (itcmdPct + invPct)) / 100 - itcmdAcum)
  const emAndamento = doacoes.filter((d) => d.status !== 'concluida')

  return (
    <div>
      {/* controles — somem na impressão */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/doacoes/familia/${family.id}`} className="text-sm text-ink-muted transition hover:text-ink">← Sucessão</Link>
        <div className="flex flex-wrap items-center gap-3">
          <form className="flex items-center gap-2 text-xs" method="get">
            <input type="hidden" name="ano" value={ano} />
            <label className="text-ink-muted">ITCMD %<input name="itcmd" type="number" step="0.5" min="0" max="8" defaultValue={itcmdPct} className="ml-1 w-16 rounded border border-line px-2 py-1" /></label>
            <label className="text-ink-muted">Inventário %<input name="inv" type="number" step="0.5" min="0" max="20" defaultValue={invPct} className="ml-1 w-16 rounded border border-line px-2 py-1" /></label>
            <button className="rounded-lg border border-line px-2.5 py-1 font-medium text-ink-muted transition hover:bg-surface">Recalcular</button>
          </form>
          <div className="flex items-center gap-1 text-sm">
            {[ano - 1, ano, ano + 1].map((a) => (
              <Link key={a} href={`/app/doacoes/familia/${family.id}/relatorio?ano=${a}&itcmd=${itcmdPct}&inv=${invPct}`}
                className={`rounded-md px-2.5 py-1 ${a === ano ? 'bg-navy text-white' : 'text-ink-muted hover:bg-surface'}`}>
                {a}
              </Link>
            ))}
          </div>
          {emailsFamilia && (
            <a
              href={`mailto:${emailsFamilia}?subject=${encodeURIComponent(`Relatório de Doações ${ano} — ${family.name}`)}&body=${encodeURIComponent('Segue o relatório de doações da família. Qualquer dúvida, estou à disposição.')}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              <Mail size={15} /> Enviar por e-mail
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      {/* A FOLHA */}
      <div className="print-page mx-auto max-w-[820px] rounded-xl2 border border-line bg-white p-10 shadow-card">
        <header className="border-b border-navy/15 pb-6">
          {org?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org?.nome ?? ''} className="mb-3 h-10 w-auto" />
          )}
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep" style={corMarca ? { color: corMarca } : undefined}>
            Relatório de Doações · {ano}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">{family.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">Sucessão em vida · emitido em {formatarDataISO(hojeISO)}</p>
        </header>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Resumo do período</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi rotulo={`Transferido em ${ano}`} valor={formatarMoeda(transferidoAno)} />
            <Kpi rotulo={`ITCMD estimado em ${ano}`} valor={formatarMoeda(itcmdAno)} />
            <Kpi rotulo="Transferido acumulado" valor={formatarMoeda(transferidoAcum)} />
            <Kpi rotulo="Custo de inventário evitado*" valor={formatarMoeda(custoEvitado)} destaque cor={corMarca} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Doações concluídas em {ano}</h2>
          {doAno.length === 0 ? (
            <p className="py-2 text-sm text-ink-soft">Nenhuma doação concluída neste ano.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/15 text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="pb-2 font-semibold">Data</th>
                  <th className="pb-2 font-semibold">Doador → Donatário</th>
                  <th className="pb-2 font-semibold">Quotas</th>
                  <th className="pb-2 text-right font-semibold">Valor</th>
                  <th className="pb-2 text-right font-semibold">ITCMD</th>
                  <th className="pb-2 font-semibold">Proteções</th>
                </tr>
              </thead>
              <tbody>
                {doAno.map((d, i) => (
                  <tr key={i} className="border-b border-line/70 align-top">
                    <td className="num py-2 text-ink-muted">{formatarDataISO(d.data_conclusao)}</td>
                    <td className="py-2 font-medium text-ink">
                      {nomeSocio.get(d.doador_id ?? '') ?? '—'} → {nomeSocio.get(d.donatario_id ?? '') ?? '—'}
                      <span className="block text-xs font-normal text-ink-soft">{nomeHolding.get(d.holding_id)}{d.cartorio ? ` · ${d.cartorio}` : ''}</span>
                    </td>
                    <td className="num py-2 text-ink-muted">{d.quantidade_quotas}</td>
                    <td className="num py-2 text-right text-ink">{formatarMoeda(Number(d.valor_estimado ?? 0))}</td>
                    <td className="num py-2 text-right text-ink-muted">{formatarMoeda(Number(d.itcmd_estimado ?? 0))}</td>
                    <td className="py-2 text-xs text-ink-muted">
                      {d.com_reserva_usufruto ? 'usufruto reservado · ' : ''}
                      {CLAUSULAS_DOACAO.filter((c) => d[c.campo as keyof typeof d]).map((c) => c.sigla).join(' · ') || '—'}
                      <span className="block text-ink-soft">
                        execução {EXECUCAO_DOACAO.filter((e) => d[e.campo as keyof typeof d]).length}/4
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {emAndamento.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Próximos passos planejados</h2>
            <ul className="space-y-1.5 text-sm">
              {emAndamento.map((d, i) => (
                <li key={i} className="flex justify-between border-b border-line/60 py-1.5">
                  <span className="text-ink">
                    {formatarDataISO(d.data_prevista)} · {nomeSocio.get(d.doador_id ?? '') ?? '—'} → {nomeSocio.get(d.donatario_id ?? '') ?? '—'} · {d.quantidade_quotas} quotas
                    <span className="text-ink-soft"> ({d.status === 'em_cartorio' ? 'em cartório' : d.adiada_em ? 'adiada por decisão da família' : 'planejada'})</span>
                  </span>
                  <span className="num text-ink-muted">{formatarMoeda(Number(d.valor_estimado ?? 0))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 border-t border-navy/15 pt-4 text-xs leading-relaxed text-ink-soft">
          <p>
            *Custo de inventário evitado é <strong>estimativa de cenário</strong>: patrimônio transferido em vida ×
            (ITCMD {itcmdPct}% + custos de inventário {invPct}%) − ITCMD já recolhido nas doações. Alíquotas e
            custos variam por estado e por caso; valores definitivos dependem de avaliação. Este relatório
            registra e organiza os fatos; os instrumentos jurídicos (doações, cláusulas, escrituras) são
            redigidos pelo advogado.
          </p>
          <p className="mt-2">Preparado por {org?.nome ?? 'seu contador'}{user?.email ? ` · ${user.email}` : ''}.</p>
        </footer>
      </div>
    </div>
  )
}

function Kpi({ rotulo, valor, destaque, cor }: { rotulo: string; valor: string; destaque?: boolean; cor?: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${destaque ? 'bg-cream/60' : 'bg-surface/60'}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{rotulo}</div>
      <div className="num mt-0.5 font-bold text-navy" style={destaque && cor ? { color: cor } : undefined}>{valor}</div>
    </div>
  )
}
