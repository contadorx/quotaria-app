import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  formatarDataISO,
  formatarMoeda,
  LABEL_TIPO_SOCIETARIO,
  LABEL_STATUS_HOLDING,
  LABEL_TIPO_DIREITO,
  LABEL_TIPO_DISTRIBUICAO,
  LABEL_PAPEL_FAMILIAR,
} from '@/lib/format'
import { PrintButton } from '@/components/print-button'

export default async function Relatorio({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { ano?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: family } = await supabase.from('families').select('id, name').eq('id', params.id).single()
  if (!family) notFound()

  const ano = Number(searchParams.ano) || new Date().getFullYear()
  const noAno = (d: string | null) => !!d && d.slice(0, 4) === String(ano)

  const { data: holdings } = await supabase
    .from('holdings').select('id, razao_social, tipo_societario, status, cnpj')
    .eq('family_id', params.id).order('razao_social')
  const holdingIds = (holdings ?? []).map((h) => h.id)

  const { data: socios } = await supabase
    .from('socios').select('id, nome, papel_familiar').eq('family_id', params.id).order('nome')

  const has = holdingIds.length > 0

  const quotas = has
    ? (await supabase.from('quotas').select('holding_id, socio_id, quantidade, percentual, tipo_direito').in('holding_id', holdingIds)).data ?? []
    : []
  const bens = has
    ? (await supabase.from('bens').select('valor_contabil, valor_mercado').in('holding_id', holdingIds)).data ?? []
    : []
  const distribuicoes = has
    ? (await supabase.from('distribuicoes').select('holding_id, competencia, valor_total, tipo, proporcional, deliberacao').in('holding_id', holdingIds)).data ?? []
    : []
  const doacoes = has
    ? (await supabase.from('doacoes').select('doador_id, donatario_id, quantidade_quotas, valor_estimado, itcmd_estimado, status, data_conclusao').in('holding_id', holdingIds)).data ?? []
    : []

  // eventos: inclui os das holdings da família E os marcos gerais (holding_id nulo)
  const { data: eventosAll } = await supabase
    .from('eventos').select('holding_id, titulo, tipo, data_prevista, status')
  const eventos = (eventosAll ?? []).filter(
    (e) => e.holding_id === null || holdingIds.includes(e.holding_id),
  )

  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const nomeHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))

  const patrimonio = bens.reduce((a, b) => a + Number(b.valor_mercado ?? b.valor_contabil ?? 0), 0)
  const distAno = distribuicoes.filter((d) => noAno(d.competencia))
  const doacoesConcluidas = doacoes.filter((d) => d.status === 'concluida')
  const doacoesAno = doacoesConcluidas.filter((d) => noAno(d.data_conclusao))
  const transferido = doacoesConcluidas.reduce((a, d) => a + Number(d.valor_estimado ?? 0), 0)
  const itcmdEconomizado = doacoesConcluidas.reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)
  const pctTransferido = transferido + patrimonio > 0 ? Math.round((transferido / (transferido + patrimonio)) * 100) : 0
  const hoje = new Date().toISOString().slice(0, 10)
  const atasAno = eventos.filter((e) => e.status === 'concluido' && noAno(e.data_prevista))
  const radar = eventos.filter((e) => e.status !== 'concluido' && e.data_prevista >= hoje).sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))

  return (
    <div>
      {/* barra de controles — some na impressão */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/relatorios" className="text-sm text-ink-muted transition hover:text-ink">← Relatórios</Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            {[ano - 1, ano, ano + 1].map((a) => (
              <Link key={a} href={`/app/relatorios/${family.id}?ano=${a}`}
                className={`rounded-md px-2.5 py-1 ${a === ano ? 'bg-navy text-white' : 'text-ink-muted hover:bg-surface'}`}>
                {a}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>

      {/* A FOLHA DO RELATÓRIO */}
      <div className="print-page mx-auto max-w-[820px] rounded-xl2 border border-line bg-white p-10 shadow-card">
        <header className="border-b border-navy/15 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Relatório Anual · {ano}</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">{family.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Gestão patrimonial e sucessória · emitido em {formatarDataISO(hoje)}
          </p>
        </header>

        <Secao n="1" titulo="Estrutura hoje">
          {(holdings ?? []).length === 0 ? (
            <Vazio>Nenhuma holding cadastrada nesta família.</Vazio>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <Th cols={['Holding', 'Tipo', 'Status', 'CNPJ']} />
              </thead>
              <tbody>
                {(holdings ?? []).map((h) => (
                  <tr key={h.id} className="border-b border-line/70">
                    <td className="py-2 font-medium text-ink">{h.razao_social}</td>
                    <td className="py-2 text-ink-muted">{LABEL_TIPO_SOCIETARIO[h.tipo_societario]}</td>
                    <td className="py-2 text-ink-muted">{LABEL_STATUS_HOLDING[h.status]}</td>
                    <td className="py-2 text-ink-muted">{h.cnpj ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 flex justify-between rounded-lg bg-cream/60 px-4 py-3 text-sm">
            <span className="text-ink-muted">Patrimônio registrado (bens das holdings)</span>
            <span className="num font-semibold text-navy">{formatarMoeda(patrimonio)}</span>
          </div>
        </Secao>

        <Secao n="2" titulo="Composição societária">
          {quotas.length === 0 ? (
            <Vazio>Nenhuma quota lançada.</Vazio>
          ) : (
            <table className="w-full text-sm">
              <thead><Th cols={['Sócio', 'Holding', 'Quotas', 'Direito']} /></thead>
              <tbody>
                {quotas.map((q, i) => (
                  <tr key={i} className="border-b border-line/70">
                    <td className="py-2 font-medium text-ink">{nomeSocio.get(q.socio_id) ?? '—'}</td>
                    <td className="py-2 text-ink-muted">{nomeHolding.get(q.holding_id) ?? '—'}</td>
                    <td className="num py-2 text-ink-muted">{q.quantidade}{q.percentual != null ? ` · ${q.percentual}%` : ''}</td>
                    <td className="py-2 text-ink-muted">{LABEL_TIPO_DIREITO[q.tipo_direito]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>

        <Secao n="3" titulo={`O que foi feito em ${ano}`}>
          <Sub>Distribuições deliberadas</Sub>
          {distAno.length === 0 ? <Vazio>Nenhuma distribuição registrada no ano.</Vazio> : (
            <ul className="space-y-1.5 text-sm">
              {distAno.map((d, i) => (
                <li key={i} className="flex justify-between border-b border-line/60 py-1.5">
                  <span className="text-ink">
                    {formatarDataISO(d.competencia)} · {nomeHolding.get(d.holding_id)} · {LABEL_TIPO_DISTRIBUICAO[d.tipo]}
                    {d.deliberacao ? <span className="text-ink-soft"> — {d.deliberacao}</span> : d.proporcional ? '' : <span className="text-amber-700"> — sem deliberação</span>}
                  </span>
                  <span className="num font-medium text-ink">{formatarMoeda(Number(d.valor_total))}</span>
                </li>
              ))}
            </ul>
          )}
          <Sub>Doações concluídas</Sub>
          {doacoesAno.length === 0 ? <Vazio>Nenhuma doação concluída no ano.</Vazio> : (
            <ul className="space-y-1.5 text-sm">
              {doacoesAno.map((d, i) => (
                <li key={i} className="flex justify-between border-b border-line/60 py-1.5">
                  <span className="text-ink">{nomeSocio.get(d.doador_id ?? '') ?? '—'} → {nomeSocio.get(d.donatario_id ?? '') ?? '—'} · {d.quantidade_quotas} quotas</span>
                  <span className="num font-medium text-ink">{formatarMoeda(Number(d.valor_estimado ?? 0))}</span>
                </li>
              ))}
            </ul>
          )}
          <Sub>Atas e obrigações cumpridas</Sub>
          {atasAno.length === 0 ? <Vazio>Nenhum evento concluído no ano.</Vazio> : (
            <ul className="space-y-1 text-sm text-ink">
              {atasAno.map((e, i) => <li key={i} className="border-b border-line/60 py-1.5">{formatarDataISO(e.data_prevista)} · {e.titulo}</li>)}
            </ul>
          )}
        </Secao>

        <Secao n="4" titulo="Sucessão em andamento">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-ink-muted">Patrimônio já transferido em vida (estimativa)</span>
            <span className="num font-semibold text-navy">{pctTransferido}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gold" style={{ width: `${pctTransferido}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-cream/60 px-4 py-3">
              <div className="text-xs text-ink-muted">Valor transferido</div>
              <div className="num mt-0.5 font-semibold text-navy">{formatarMoeda(transferido)}</div>
            </div>
            <div className="rounded-lg bg-cream/60 px-4 py-3">
              <div className="text-xs text-ink-muted">ITCMD estimado economizado</div>
              <div className="num mt-0.5 font-semibold text-navy">{formatarMoeda(itcmdEconomizado)}</div>
            </div>
          </div>
        </Secao>

        <Secao n="5" titulo="Radar — próximos marcos">
          {radar.length === 0 ? <Vazio>Nenhum marco futuro registrado. Use o Calendário para popular a Reforma 2026-2033.</Vazio> : (
            <ul className="space-y-1 text-sm text-ink">
              {radar.slice(0, 8).map((e, i) => (
                <li key={i} className="flex gap-3 border-b border-line/60 py-1.5">
                  <span className="num w-20 shrink-0 text-ink-muted">{formatarDataISO(e.data_prevista)}</span>
                  <span>{e.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <footer className="mt-10 border-t border-navy/15 pt-4 text-xs leading-relaxed text-ink-soft">
          <p>
            Valores de ITCMD e economia são <strong>estimativas de cenário</strong> e variam conforme a legislação
            estadual e a avaliação dos bens. Este relatório organiza e registra fatos contábeis; a redação e
            interpretação de instrumentos jurídicos (doações, cláusulas, pactos) cabem ao advogado.
          </p>
          <p className="mt-2">Preparado por {user?.email ?? 'seu contador'}.</p>
        </footer>
      </div>
    </div>
  )
}

function Secao({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-gold text-[11px] font-bold text-white">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}
function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">{children}</h3>
}
function Th({ cols }: { cols: string[] }) {
  return (
    <tr className="border-b border-navy/15 text-left text-xs uppercase tracking-wide text-ink-soft">
      {cols.map((c) => <th key={c} className="pb-2 font-semibold">{c}</th>)}
    </tr>
  )
}
function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-ink-soft">{children}</p>
}
