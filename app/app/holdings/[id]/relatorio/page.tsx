import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda, LABEL_TIPO_DIREITO, LABEL_TIPO_BEM, LABEL_TIPO_CLAUSULA } from '@/lib/format'
import { PrintButton } from '@/components/print-button'
import { MarcaEscritorio, AssinaturaEscritorio } from '@/components/marca-escritorio'
import {
  saudeAno, resumoDistribuicoes, resumoDoacoes, sucessaoAndamento,
  economiaRealizada, conformidadeDossie, conformidadeReforma, radarProximoAno,
  recomendacoesAno, type Fechamento, type Distribuicao, type Doacao, type Conformidade,
} from '@/lib/relatorio-anual'

export const dynamic = 'force-dynamic'

const DOT: Record<string, string> = { verde: 'bg-emerald-500', amarelo: 'bg-gold', vermelho: 'bg-red-500' }
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function dataBr(v: string | null) {
  if (!v) return '—'
  const [a, m, d] = v.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
function compBr(v: string) {
  const [a, m] = v.slice(0, 10).split('-')
  return `${MES[Number(m) - 1]}/${a.slice(2)}`
}

export default async function RelatorioAnualPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { ano?: string }
}) {
  const supabase = createClient()
  const anoAtual = new Date().getFullYear()
  const ano = Number(searchParams?.ano) || anoAtual
  const de = `${ano}-01-01`
  const ate = `${ano}-12-31`

  const { data: holding } = await supabase.from('holdings').select('*').eq('id', params.id).single()
  if (!holding) notFound()

  const [{ data: family }, { data: org }, { data: socios }, { data: quotas }, { data: bens }, { data: clausulas }] =
    await Promise.all([
      supabase.from('families').select('name').eq('id', holding.family_id).maybeSingle(),
      supabase.from('organizations').select('nome, crc, logo_url, cor_primaria').eq('id', holding.organization_id).maybeSingle(),
      supabase.from('socios').select('id, nome').eq('family_id', holding.family_id),
      supabase.from('quotas').select('socio_id, quantidade, percentual, tipo_direito').eq('holding_id', params.id),
      supabase.from('bens').select('tipo, descricao, valor_contabil, gera_receita').eq('holding_id', params.id),
      supabase.from('clausulas').select('tipo, descricao').eq('holding_id', params.id),
    ])

  const [{ data: fechamentos }, { data: distribuicoes }, { data: doacoes }, { data: docs }, { data: conf }] =
    await Promise.all([
      supabase.from('fechamentos')
        .select('competencia, distribuicoes_ok, documentos_ok, alertas_ok, alugueis_ok, doacoes_ok')
        .eq('holding_id', params.id).gte('competencia', de).lte('competencia', ate).order('competencia'),
      supabase.from('distribuicoes')
        .select('competencia, valor_total, tipo, deliberacao, data_deliberacao')
        .eq('holding_id', params.id).gte('competencia', de).lte('competencia', ate).order('competencia'),
      supabase.from('doacoes')
        .select('quantidade_quotas, valor_estimado, itcmd_estimado, status, data_conclusao')
        .eq('holding_id', params.id),
      supabase.from('documentos').select('id').eq('holding_id', params.id).gte('competencia', de).lte('competencia', ate),
      supabase.from('conformidade_reforma')
        .select('nfse_cbs, clausula_repasse, credito_locatario, redutor_social, regime_caixa')
        .eq('holding_id', params.id).maybeSingle(),
    ])

  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const totalQuotas = (quotas ?? []).reduce((s, q) => s + Number(q.quantidade), 0)
  const temReceita = (bens ?? []).some((b) => b.gera_receita)
  const temHerdeiros = (socios ?? []).length > 1

  const saude = saudeAno((fechamentos ?? []) as Fechamento[])
  const rdist = resumoDistribuicoes((distribuicoes ?? []) as Distribuicao[])
  const rdoa = resumoDoacoes((doacoes ?? []) as Doacao[])
  const suc = sucessaoAndamento(rdoa.quotasDoadas, totalQuotas)
  const econ = economiaRealizada(rdoa.valorTransmitido, rdoa.itcmdPago)
  const dossie = conformidadeDossie((docs ?? []).length)
  const reforma = conformidadeReforma(conf as Conformidade)
  const marcos = radarProximoAno(ano + 1)
  const recs = recomendacoesAno({
    mesesFechados: saude.mesesFechados,
    distSemDeliberacao: rdist.semDeliberacao,
    dossiePct: dossie.pct,
    reformaPct: reforma.pct,
    temLocacao: temReceita,
    sucessaoPct: suc.pct,
    temHerdeiros,
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/app/holdings/${params.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Voltar à holding
        </Link>
        <div className="flex items-center gap-2">
          {[anoAtual, anoAtual - 1].map((a) => (
            <Link
              key={a}
              href={`/app/holdings/${params.id}/relatorio?ano=${a}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                a === ano ? 'border-navy bg-navy text-white' : 'border-line text-ink-muted hover:bg-surface'
              }`}
            >
              {a}
            </Link>
          ))}
          <PrintButton />
        </div>
      </div>

      <article className="print-page rounded-xl2 border border-line bg-white p-8 shadow-card print:border-0 print:shadow-none">
        {/* capa */}
        <MarcaEscritorio
          nome={org?.nome ?? null}
          crc={org?.crc ?? null}
          logoUrl={org?.logo_url ?? null}
          corPrimaria={org?.cor_primaria ?? null}
          titulo={holding.razao_social}
          subtitulo={`${family?.name ? `Família ${family.name} · ` : ''}Relatório Anual · Exercício ${ano}`}
          meta={<span>Emitido em: {new Date().toLocaleDateString('pt-BR')}</span>}
        />
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <span className={`h-3.5 w-3.5 rounded-full ${DOT[saude.cor]}`} />
          <span className="text-sm font-semibold text-ink">{saude.texto}</span>
            <span className="ml-auto text-xs text-ink-soft">
              {saude.mesesFechados}/12 meses fechados · {saude.pctCriterios}% dos critérios
            </span>
          </div>

        {/* 1. estrutura hoje */}
        <Sec n="1" t="A estrutura hoje">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Sub>Quotas por sócio</Sub>
              <ul className="mt-1 space-y-1 text-sm">
                {(quotas ?? []).length === 0 && <li className="text-ink-soft">—</li>}
                {(quotas ?? []).map((q, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink">{nomeSocio.get(q.socio_id) ?? 'sócio'} <span className="text-ink-soft">({LABEL_TIPO_DIREITO[q.tipo_direito]})</span></span>
                    <span className="font-semibold text-ink">{q.percentual != null ? `${q.percentual}%` : `${q.quantidade}`}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Sub>Bens</Sub>
              <ul className="mt-1 space-y-1 text-sm">
                {(bens ?? []).length === 0 && <li className="text-ink-soft">—</li>}
                {(bens ?? []).map((b, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink">{b.descricao} <span className="text-ink-soft">({LABEL_TIPO_BEM[b.tipo]})</span>{b.gera_receita ? ' · locado' : ''}</span>
                    <span className="font-semibold text-ink">{formatarMoeda(Number(b.valor_contabil ?? 0))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {(clausulas ?? []).length > 0 && (
            <div className="mt-3">
              <Sub>Cláusulas de proteção</Sub>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(clausulas ?? []).map((c, i) => (
                  <span key={i} className="rounded-full border border-line bg-cream px-2.5 py-0.5 text-xs font-medium text-navy">
                    {LABEL_TIPO_CLAUSULA[c.tipo] ?? c.tipo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Sec>

        {/* 2. o que foi feito no ano */}
        <Sec n="2" t="O que foi feito no ano">
          <p className="text-sm text-ink-muted">O serviço invisível vira lista visível.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Kpi rotulo="Meses fechados" valor={`${saude.mesesFechados}/12`} />
            <Kpi rotulo="Distribuições deliberadas" valor={`${rdist.comDeliberacao}/${rdist.qtd}`} />
            <Kpi rotulo="Doações concluídas" valor={String(rdoa.concluidas)} />
          </div>

          {rdist.qtd > 0 && (
            <div className="mt-4">
              <Sub>Distribuições ({formatarMoeda(rdist.total)} no ano)</Sub>
              <table className="mt-1 w-full border-collapse text-sm">
                <tbody>
                  {((distribuicoes ?? []) as Distribuicao[]).map((d, i) => {
                    const deliberada = (d.deliberacao && d.deliberacao.trim()) || d.data_deliberacao
                    return (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="py-1.5 text-ink">{compBr(d.competencia)}</td>
                        <td className="py-1.5 text-ink-muted">{d.tipo}</td>
                        <td className="py-1.5 text-right font-semibold text-ink">{formatarMoeda(Number(d.valor_total))}</td>
                        <td className="py-1.5 pl-3 text-right">
                          {deliberada ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check size={12} /> deliberada</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><X size={12} /> sem ata</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {rdist.semDeliberacao > 0 && (
                <p className="mt-1.5 text-xs text-red-600">
                  {rdist.semDeliberacao} distribuição(ões) sem deliberação vinculada — regularizar (defesa fiscal).
                </p>
              )}
            </div>
          )}

          {rdoa.concluidas > 0 && (
            <div className="mt-4">
              <Sub>Doações concluídas no cronograma</Sub>
              <p className="mt-1 text-sm text-ink">
                {rdoa.quotasDoadas} quota(s) transmitida(s) em vida · ITCMD estimado de {formatarMoeda(rdoa.itcmdPago)}.
                {rdoa.emAndamento > 0 ? ` ${rdoa.emAndamento} doação(ões) em andamento.` : ''}
              </p>
            </div>
          )}
        </Sec>

        {/* 3. conformidade documental */}
        <Sec n="3" t="Conformidade documental">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Sub>Dossiê do ano</Sub>
              <Barra pct={dossie.pct} />
              <p className="mt-1 text-xs text-ink-soft">{dossie.docsNoAno} documento(s) arquivado(s) no exercício.</p>
            </div>
            {temReceita && (
              <div>
                <Sub>Locação sob a Reforma</Sub>
                <Barra pct={reforma.pct} />
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {reforma.itens.map((it, i) => (
                    <li key={i} className={`flex items-center gap-1.5 ${it.ok ? 'text-emerald-700' : 'text-ink-soft'}`}>
                      {it.ok ? <Check size={11} /> : <X size={11} />} {it.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Sec>

        {/* 4. sucessão + economia */}
        <Sec n="4" t="Sucessão em andamento">
          <Sub>{suc.pct}% do capital já transmitido em vida</Sub>
          <Barra pct={suc.pct} />
          <p className="mt-1 text-xs text-ink-soft">
            {suc.transmitidas} de {suc.total} quota(s) já transferida(s) por doação concluída.
          </p>
          {econ.economia > 0 && (
            <div className="mt-3 rounded-xl border-l-4 border-gold bg-cream px-4 py-3 text-sm text-navy">
              <strong>Economia realizada:</strong> as {formatarMoeda(rdoa.valorTransmitido)} transmitidos em vida
              custaram {formatarMoeda(econ.itcmdPago)} de ITCMD. No cenário de inventário sobre o mesmo valor
              (estimativa conservadora de {econ.custoInventarioPct}%), o custo seria ~{formatarMoeda(econ.custoInventario)} —
              uma economia estimada de <strong>{formatarMoeda(econ.economia)}</strong>, já realizada.
            </div>
          )}
        </Sec>

        {/* 5. radar do próximo ano */}
        <Sec n="5" t={`Radar de ${ano + 1}`}>
          <p className="text-sm text-ink-muted">Os próximos marcos da Reforma que tocam esta holding.</p>
          <ul className="mt-2 space-y-2">
            {marcos.map((m, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 font-bold text-gold-deep">{m.data.slice(0, 4)}</span>
                <span className="text-ink"><strong className="text-navy">{m.titulo}</strong> — {m.detalhe}</span>
              </li>
            ))}
          </ul>
        </Sec>

        {/* 6. recomendações */}
        <Sec n="6" t="Recomendações do contador">
          <ol className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">{i + 1}</span>
                <span className="text-ink">{r}</span>
              </li>
            ))}
          </ol>
        </Sec>

        {/* fronteira */}
        <footer className="mt-7 rounded-xl border-l-4 border-gold bg-cream px-4 py-3">
          <p className="text-xs font-semibold text-navy">Nota metodológica</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            Este relatório consolida os registros do exercício. As economias e o ITCMD são estimativas de
            cenário e variam conforme o estado e o caso; não constituem apuração fiscal definitiva. O contador
            registra, calcula e organiza; a redação e a interpretação de instrumentos jurídicos são atribuição
            do advogado parceiro. Honorários contábeis e advocatícios são cobrados à parte.
          </p>
        </footer>

        <AssinaturaEscritorio nome={org?.nome ?? null} crc={org?.crc ?? null} />
      </article>
    </div>
  )
}

function Sec({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-b border-gold pb-1 text-xs font-bold uppercase tracking-wider text-navy">
        Parte {n} — {t}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-ink">{children}</p>
}
function Kpi({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{rotulo}</p>
      <p className="num mt-0.5 text-lg font-bold text-navy">{valor}</p>
    </div>
  )
}
function Barra({ pct }: { pct: number }) {
  const cor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-gold' : 'bg-red-500'
  return (
    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
