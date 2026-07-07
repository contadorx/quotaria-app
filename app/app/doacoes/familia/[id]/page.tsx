import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, AlertTriangle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, formatarMoeda, CLAUSULAS_DOACAO, EXECUCAO_DOACAO, LABEL_MOTIVO_EXTINCAO } from '@/lib/format'
import { updateDoacaoExecucao } from '../../../actions'
import { PageHeader, Card, SectionTitle, SubmitButton, Pill, EmptyState } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { SimuladorDoacao } from '@/components/simulador-doacao'

type Doacao = {
  id: string
  holding_id: string
  doador_id: string | null
  donatario_id: string | null
  quantidade_quotas: number
  valor_estimado: number | null
  itcmd_estimado: number | null
  com_reserva_usufruto: boolean
  data_prevista: string | null
  data_conclusao: string | null
  status: string
  minuta_solicitada: boolean
  guia_itcmd_paga: boolean
  escritura_lavrada: boolean
  registro_concluido: boolean
  clausula_incomunicabilidade: boolean
  clausula_impenhorabilidade: boolean
  clausula_inalienabilidade: boolean
  clausula_reversao: boolean
  usufruto_extinto_em: string | null
  usufruto_extinto_motivo: string | null
  consolidacao_registrada: boolean
}

const DOT: Record<string, string> = {
  concluida: 'bg-emerald-500',
  em_cartorio: 'bg-amber-500',
  planejada: 'bg-gold',
}
const ROTULO: Record<string, string> = {
  concluida: 'Concluída',
  em_cartorio: 'Em cartório',
  planejada: 'Planejada',
}

export default async function SucessaoFamiliaPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: family } = await supabase.from('families').select('id, name').eq('id', params.id).single()
  if (!family) notFound()

  const { data: holdings } = await supabase
    .from('holdings').select('id, razao_social').eq('family_id', params.id)
  const holdingIds = (holdings ?? []).map((h) => h.id)

  const { data: socios } = await supabase
    .from('socios').select('id, nome').eq('family_id', params.id)
  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const nomeHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))

  const doacoes: Doacao[] = holdingIds.length
    ? ((await supabase
        .from('doacoes')
        .select('id, holding_id, doador_id, donatario_id, quantidade_quotas, valor_estimado, itcmd_estimado, com_reserva_usufruto, data_prevista, data_conclusao, status, minuta_solicitada, guia_itcmd_paga, escritura_lavrada, registro_concluido, clausula_incomunicabilidade, clausula_impenhorabilidade, clausula_inalienabilidade, clausula_reversao, usufruto_extinto_em, usufruto_extinto_motivo, consolidacao_registrada')
        .in('holding_id', holdingIds)).data as Doacao[] | null) ?? []
    : []

  const bens = holdingIds.length
    ? (await supabase.from('bens').select('valor_contabil, valor_mercado').in('holding_id', holdingIds)).data ?? []
    : []

  const patrimonio = bens.reduce((a, b) => a + Number(b.valor_mercado ?? b.valor_contabil ?? 0), 0)
  const concluidas = doacoes.filter((d) => d.status === 'concluida')
  const transferido = concluidas.reduce((a, d) => a + Number(d.valor_estimado ?? 0), 0)
  const pct = transferido + patrimonio > 0 ? Math.round((transferido / (transferido + patrimonio)) * 100) : 0

  const ordenadas = [...doacoes].sort((a, b) =>
    (a.data_conclusao ?? a.data_prevista ?? '9999').localeCompare(b.data_conclusao ?? b.data_prevista ?? '9999'),
  )
  const comUsufruto = doacoes.filter((d) => d.com_reserva_usufruto)
  const consolidacoesPendentes = comUsufruto.filter((d) => d.usufruto_extinto_em && !d.consolidacao_registrada)

  return (
    <div>
      <PageHeader
        back={{ href: '/app/doacoes', label: 'Doações' }}
        eyebrow="Sucessão em vida"
        title={family.name}
        description="A operação sucessória da família: o que já foi transferido, o que está no caminho, e os cenários para a próxima decisão."
        action={
          <Link
            href={`/app/doacoes/familia/${family.id}/relatorio`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft"
          >
            <FileText size={15} />
            Relatório de doações
          </Link>
        }
      />

      {/* JANELA — curadoria datada */}
      <div className="mb-6 rounded-xl2 border border-gold/40 bg-cream/60 px-4 py-3 text-sm text-ink">
        <strong className="font-semibold text-navy">A janela do ITCMD (curadoria de 07/07/2026):</strong>{' '}
        o PLP 108 em tramitação leva a base das quotas a valor de mercado, e SP já sinaliza exigir a
        mudança mesmo antes dele; a EC 132 impõe progressividade (teto 8%). Doar quotas pelo valor
        contábil <strong className="font-semibold">tem prazo</strong> — use o simulador abaixo na reunião.
      </div>

      {consolidacoesPendentes.length > 0 && (
        <div className="mb-6 flex items-start gap-2 rounded-xl2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">{consolidacoesPendentes.length} consolidação(ões) pendente(s)</strong> nesta
            família — usufruto extinto sem registro da propriedade plena.
          </span>
        </div>
      )}

      {/* % TRANSFERIDO */}
      <SectionTitle>Progresso da sucessão</SectionTitle>
      <Card className="mt-3 p-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-muted">Patrimônio já transferido em vida (estimativa)</span>
          <span className="num text-lg font-bold text-navy">{pct}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div><span className="text-xs text-ink-soft">Transferido</span><div className="num font-semibold text-ink">{formatarMoeda(transferido)}</div></div>
          <div><span className="text-xs text-ink-soft">Ainda nas holdings/PF</span><div className="num font-semibold text-ink">{formatarMoeda(patrimonio)}</div></div>
          <div><span className="text-xs text-ink-soft">Doações concluídas</span><div className="num font-semibold text-ink">{concluidas.length} de {doacoes.length}</div></div>
        </div>
      </Card>

      {/* LINHA DO TEMPO */}
      <div className="mt-8"><SectionTitle>Linha do tempo sucessória</SectionTitle></div>
      {ordenadas.length === 0 ? (
        <div className="mt-3"><EmptyState>Nenhuma doação registrada para esta família ainda.</EmptyState></div>
      ) : (
        <Card className="mt-3 p-5">
          <ol className="relative space-y-5 border-l-2 border-line pl-5">
            {ordenadas.map((d) => {
              const exec = EXECUCAO_DOACAO.filter((e) => d[e.campo as keyof Doacao]).length
              return (
                <li key={d.id} className="relative">
                  <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${DOT[d.status] ?? 'bg-ink-soft/50'}`} />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="num w-20 shrink-0 text-ink-muted">{formatarDataISO(d.data_conclusao ?? d.data_prevista)}</span>
                    <span className="font-medium text-ink">{d.doador_id ? nomeSocio.get(d.doador_id) ?? '—' : '—'}</span>
                    <ArrowRight size={13} className="text-ink-soft" />
                    <span className="font-medium text-ink">{d.donatario_id ? nomeSocio.get(d.donatario_id) ?? '—' : '—'}</span>
                    <span className="text-xs text-ink-soft">· {d.quantidade_quotas} quotas · {nomeHolding.get(d.holding_id)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                    <Pill>{ROTULO[d.status] ?? d.status}</Pill>
                    {d.valor_estimado != null && <span className="num">{formatarMoeda(Number(d.valor_estimado))}</span>}
                    {CLAUSULAS_DOACAO.filter((c) => d[c.campo as keyof Doacao]).map((c) => (
                      <span key={c.sigla} title={c.label} className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-semibold text-navy">{c.sigla}</span>
                    ))}
                    <span>execução {exec}/4</span>
                    {d.usufruto_extinto_em && !d.consolidacao_registrada && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">consolidação pendente</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {/* USUFRUTO */}
      {comUsufruto.length > 0 && (
        <>
          <div className="mt-8"><SectionTitle>Controle de usufruto</SectionTitle></div>
          <p className="mt-1 text-xs text-ink-soft">
            Nua-propriedade doada com usufruto reservado. Na extinção (falecimento/renúncia), registre aqui e
            conduza a consolidação com o advogado — a informação que se perdia na planilha.
          </p>
          <Card className="mt-3 divide-y divide-line overflow-hidden">
            {comUsufruto.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium text-ink">
                  {d.doador_id ? nomeSocio.get(d.doador_id) ?? '—' : '—'} → {d.donatario_id ? nomeSocio.get(d.donatario_id) ?? '—' : '—'}
                  <span className="ml-2 text-xs font-normal text-ink-soft">{d.quantidade_quotas} quotas · {nomeHolding.get(d.holding_id)}</span>
                </span>
                {!d.usufruto_extinto_em ? (
                  <Pill>usufruto vigente</Pill>
                ) : d.consolidacao_registrada ? (
                  <span className="text-xs text-emerald-700">consolidada em {formatarDataISO(d.usufruto_extinto_em)}</span>
                ) : (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    extinto em {formatarDataISO(d.usufruto_extinto_em)} · consolidação pendente
                  </span>
                )}
                <EditDialog title="Usufruto e consolidação" label="Atualizar" compact>
                  <form className="space-y-3">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="voltar" value={`/app/doacoes/familia/${family.id}`} />
                    {EXECUCAO_DOACAO.map((e) => (
                      <input key={e.campo} type="hidden" name={e.campo} value={d[e.campo as keyof Doacao] ? 'on' : ''} />
                    ))}
                    {CLAUSULAS_DOACAO.map((c) => (
                      <input key={c.campo} type="hidden" name={c.campo} value={d[c.campo as keyof Doacao] ? 'on' : ''} />
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-ink-muted">Extinto em</label>
                        <input name="usufruto_extinto_em" type="date" defaultValue={d.usufruto_extinto_em ?? ''} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-muted">Motivo</label>
                        <select name="usufruto_extinto_motivo" defaultValue={d.usufruto_extinto_motivo ?? ''} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
                          <option value="">—</option>
                          {Object.entries(LABEL_MOTIVO_EXTINCAO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" name="consolidacao_registrada" defaultChecked={d.consolidacao_registrada} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                      Consolidação da propriedade plena registrada
                    </label>
                    <div className="flex justify-end"><SubmitButton action={updateDoacaoExecucao}>Salvar</SubmitButton></div>
                  </form>
                </EditDialog>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* SIMULADOR */}
      <div className="mt-8"><SectionTitle>Cenários para a próxima decisão</SectionTitle></div>
      <div className="mt-3">
        <SimuladorDoacao patrimonioInicial={patrimonio} />
      </div>
    </div>
  )
}
