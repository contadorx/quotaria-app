import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, formatarMoeda, LABEL_STATUS_DOACAO, LABEL_MOTIVO_EXTINCAO, CLAUSULAS_DOACAO, EXECUCAO_DOACAO } from '@/lib/format'
import { createDoacao, changeStatusDoacao, deleteDoacao, updateDoacaoExecucao, updateDoacaoCronograma } from '../actions'
import { PageHeader, Card, EmptyState, SubmitButton, Pill } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { EditDialog } from '@/components/edit-dialog'
import { PendingButton } from '@/components/submit-button'
import { FormNovaDoacao } from '@/components/form-nova-doacao'
import { FiltroFamiliaChip } from '@/components/filtro-familia-chip'

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
  status: string
  cartorio: string | null
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
  adiada_em: string | null
  adiada_motivo: string | null
}

export default async function DoacoesPage({
  searchParams,
}: {
  searchParams: { error?: string; fam?: string }
}) {
  const supabase = createClient()

  const { data: holdings } = await supabase.from('holdings').select('id, razao_social, family_id').order('razao_social')
  const { data: socios } = await supabase.from('socios').select('id, nome, family_id').order('nome')
  const { data: families } = await supabase.from('families').select('id, name')
  const { data: doacoes } = await supabase
    .from('doacoes')
    .select('id, holding_id, doador_id, donatario_id, quantidade_quotas, valor_estimado, itcmd_estimado, com_reserva_usufruto, data_prevista, status, cartorio, minuta_solicitada, guia_itcmd_paga, escritura_lavrada, registro_concluido, clausula_incomunicabilidade, clausula_impenhorabilidade, clausula_inalienabilidade, clausula_reversao, usufruto_extinto_em, usufruto_extinto_motivo, consolidacao_registrada, adiada_em, adiada_motivo')
    .order('data_prevista', { nullsFirst: false })

  const nomeFamilia = new Map((families ?? []).map((f) => [f.id, f.name]))
  const nomePorHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))
  const socioNome = new Map((socios ?? []).map((s) => [s.id, s.nome]))

  const famId = searchParams?.fam
  const idsFam = new Set((holdings ?? []).filter((h) => !famId || h.family_id === famId).map((h) => h.id))

  const temHoldings = (holdings ?? []).length > 0
  const lista = ((doacoes ?? []) as Doacao[]).filter((d) => !famId || idsFam.has(d.holding_id))

  const planejadas = lista.filter((d) => d.status === 'planejada')
  const emCartorio = lista.filter((d) => d.status === 'em_cartorio')
  const concluidas = lista.filter((d) => d.status === 'concluida')
  const itcmdTotal = lista.reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)
  const hojeISO = new Date().toISOString().slice(0, 10)
  const atrasadas = lista.filter((d) => d.status === 'planejada' && d.data_prevista && d.data_prevista < hojeISO && !d.adiada_em)
  const consolidacoesPendentes = lista.filter(
    (d) => d.usufruto_extinto_em && !d.consolidacao_registrada,
  )
  const familiaPorHolding = new Map((holdings ?? []).map((h) => [h.id, h.family_id]))
  const familiasComDoacao = Array.from(
    new Set(lista.map((d) => familiaPorHolding.get(d.holding_id)).filter(Boolean)),
  ) as string[]
  const transferido = concluidas.reduce((a, d) => a + Number(d.valor_estimado ?? 0), 0)

  return (
    <div>
      <PageHeader
        eyebrow="Sucessão"
        title="Doações"
        description="Cronograma de doação de quotas em vida — o ritmo que realiza a economia de ITCMD e inventário prometida na proposta."
      />

      {famId && <FiltroFamiliaChip nome={nomeFamilia.get(famId) ?? 'Família'} base="/app/doacoes" />}

      {atrasadas.length > 0 && (
        <div className="mb-6 flex items-start gap-2 rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">{atrasadas.length} doação(ões) planejada(s) com data vencida.</strong> O
            ROI prometido depende do cronograma — reagende ou, se a família decidiu esperar, registre o
            adiamento no botão <em>Cronograma</em> (o alerta some e a decisão fica documentada).
          </span>
        </div>
      )}

      {consolidacoesPendentes.length > 0 && (
        <div className="mb-6 flex items-start gap-2 rounded-xl2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">{consolidacoesPendentes.length} consolidação(ões) de usufruto pendente(s)</strong> — o
            usufruto foi extinto e o registro da propriedade plena ainda não foi atualizado. Abra a doação em
            <em> Operação</em> e conclua com o advogado/cartório.
          </span>
        </div>
      )}

      {familiasComDoacao.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sucessão por família:</span>
          {familiasComDoacao.map((fid) => (
            <Link key={fid} href={`/app/doacoes/familia/${fid}`}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink-muted transition hover:bg-surface hover:text-ink">
              {nomeFamilia.get(fid) ?? 'Família'} →
            </Link>
          ))}
        </div>
      )}

      {!temHoldings ? (
        <EmptyState>
          Cadastre uma holding e seus sócios antes de planejar doações.{' '}
          <Link href="/app" className="font-semibold text-navy underline-offset-2 hover:underline">Ir para Famílias →</Link>
        </EmptyState>
      ) : (
        <>
          <Card className="p-5">
            <FormNovaDoacao holdings={holdings ?? []} socios={socios ?? []} familias={families ?? []} />
            {searchParams?.error && <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
          </Card>

          {lista.length === 0 ? (
            <div className="mt-6"><EmptyState>Nenhuma doação planejada ainda.</EmptyState></div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Resumo rotulo="Planejadas" valor={String(planejadas.length)} />
                <Resumo rotulo="Em cartório" valor={String(emCartorio.length)} />
                <Resumo rotulo="Já transferido" valor={formatarMoeda(transferido)} />
                <Resumo rotulo="ITCMD estimado" valor={formatarMoeda(itcmdTotal)} />
              </div>

              <div className="mt-8 space-y-8">
                <Grupo titulo="Planejadas" cor="gold" doacoes={planejadas} {...{ nomePorHolding, socioNome }} />
                <Grupo titulo="Em cartório" cor="amber" doacoes={emCartorio} {...{ nomePorHolding, socioNome }} />
                <Grupo titulo="Concluídas" cor="emerald" doacoes={concluidas} {...{ nomePorHolding, socioNome }} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{rotulo}</div>
      <div className="num mt-1 text-lg font-bold text-ink">{valor}</div>
    </Card>
  )
}

const DOT: Record<string, string> = { gold: 'bg-gold', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }
const PROX: Record<string, { to: string; label: string }> = {
  planejada: { to: 'em_cartorio', label: '→ Cartório' },
  em_cartorio: { to: 'concluida', label: 'Concluir' },
  concluida: { to: 'planejada', label: 'Reabrir' },
}

function Grupo({
  titulo,
  cor,
  doacoes,
  nomePorHolding,
  socioNome,
}: {
  titulo: string
  cor: string
  doacoes: Doacao[]
  nomePorHolding: Map<string, string>
  socioNome: Map<string, string>
}) {
  if (doacoes.length === 0) return null
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${DOT[cor]}`} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {titulo} <span className="text-ink-soft">({doacoes.length})</span>
        </h2>
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {doacoes.map((d) => {
          const prox = PROX[d.status]
          return (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
              <span className="w-20 shrink-0 tabular-nums text-ink-muted">{formatarDataISO(d.data_prevista)}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                  <span>{d.doador_id ? socioNome.get(d.doador_id) ?? 'sócio removido' : '—'}</span>
                  <ArrowRight size={14} className="text-ink-soft" />
                  <span>{d.donatario_id ? socioNome.get(d.donatario_id) ?? 'sócio removido' : '—'}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <span className="num">{d.quantidade_quotas} quotas</span>
                  <span>· {nomePorHolding.get(d.holding_id) ?? 'holding'}</span>
                  {d.status === 'planejada' && d.data_prevista && d.data_prevista < new Date().toISOString().slice(0, 10) && !d.adiada_em && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">atrasada</span>
                  )}
                  {d.status === 'planejada' && d.adiada_em && (
                    <span title={d.adiada_motivo ?? undefined} className="rounded-full bg-ink-soft/10 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      adiada por decisão · {formatarDataISO(d.adiada_em)}
                    </span>
                  )}
                  {d.com_reserva_usufruto && !d.usufruto_extinto_em && <Pill>usufruto vigente</Pill>}
                  {d.usufruto_extinto_em && !d.consolidacao_registrada && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      consolidação pendente
                    </span>
                  )}
                  {d.usufruto_extinto_em && d.consolidacao_registrada && <Pill>propriedade consolidada</Pill>}
                  {CLAUSULAS_DOACAO.filter((c) => d[c.campo as keyof Doacao]).map((c) => (
                    <span key={c.sigla} title={c.label} className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-semibold text-navy">
                      {c.sigla}
                    </span>
                  ))}
                  <span className="text-ink-soft">
                    execução {EXECUCAO_DOACAO.filter((e) => d[e.campo as keyof Doacao]).length}/4
                  </span>
                  {d.cartorio ? <span>· {d.cartorio}</span> : null}
                </div>
              </div>
              <div className="hidden text-right sm:block">
                {d.valor_estimado != null && <div className="num text-ink">{formatarMoeda(Number(d.valor_estimado))}</div>}
                {d.itcmd_estimado != null && <div className="num text-xs text-ink-soft">ITCMD {formatarMoeda(Number(d.itcmd_estimado))}</div>}
              </div>
              {d.status === 'planejada' && (
                <EditDialog title="Cronograma da doação" label="Cronograma" compact>
                  <form className="space-y-4">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="voltar" value="/app/doacoes" />
                    <div>
                      <label className="block text-xs font-medium text-ink-muted">Reagendar para</label>
                      <input name="nova_data" type="date" className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
                      <p className="mt-1 text-[11px] text-ink-soft">Preencher a nova data limpa qualquer adiamento registrado.</p>
                    </div>
                    <div className="rounded-lg border border-line bg-surface/60 p-3">
                      <label className="flex items-start gap-2 text-sm text-ink">
                        <input type="checkbox" name="adiar" defaultChecked={!!d.adiada_em} className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                        <span>
                          Adiar por decisão (sem nova data)
                          <span className="block text-[11px] font-normal text-ink-soft">O alerta some e a decisão fica registrada — sem punição, com prova de diligência.</span>
                        </span>
                      </label>
                      <input name="adiada_motivo" placeholder="Motivo (ex.: decisão da família — aguardar venda do imóvel)" defaultValue={d.adiada_motivo ?? ''} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
                    </div>
                    <div className="flex justify-end"><SubmitButton action={updateDoacaoCronograma}>Salvar cronograma</SubmitButton></div>
                  </form>
                </EditDialog>
              )}
              <EditDialog title="Operação da doação" label="Operação">
                <form className="space-y-4">
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="voltar" value="/app/doacoes" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Checklist de execução</p>
                    <div className="mt-2 space-y-2">
                      {EXECUCAO_DOACAO.map((e) => (
                        <label key={e.campo} className="flex items-center gap-2.5 text-sm text-ink">
                          <input type="checkbox" name={e.campo} defaultChecked={!!d[e.campo as keyof Doacao]} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                          {e.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cláusulas aplicadas (redigidas pelo advogado)</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {CLAUSULAS_DOACAO.map((c) => (
                        <label key={c.campo} className="flex items-center gap-2 text-sm text-ink">
                          <input type="checkbox" name={c.campo} defaultChecked={!!d[c.campo as keyof Doacao]} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {d.com_reserva_usufruto && (
                    <div className="rounded-lg border border-line bg-surface/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Usufruto</p>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor={`ext_${d.id}`} className="block text-xs font-medium text-ink-muted">Extinto em</label>
                          <input id={`ext_${d.id}`} name="usufruto_extinto_em" type="date" defaultValue={d.usufruto_extinto_em ?? ''} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label htmlFor={`mot_${d.id}`} className="block text-xs font-medium text-ink-muted">Motivo</label>
                          <select id={`mot_${d.id}`} name="usufruto_extinto_motivo" defaultValue={d.usufruto_extinto_motivo ?? ''} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
                            <option value="">—</option>
                            {Object.entries(LABEL_MOTIVO_EXTINCAO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                        <input type="checkbox" name="consolidacao_registrada" defaultChecked={d.consolidacao_registrada} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                        Consolidação da propriedade plena registrada
                      </label>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <SubmitButton action={updateDoacaoExecucao}>Salvar operação</SubmitButton>
                  </div>
                </form>
              </EditDialog>
              <form action={changeStatusDoacao}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="to" value={prox.to} />
                <PendingButton className="whitespace-nowrap rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink">
                  {prox.label}
                </PendingButton>
              </form>
              <DeleteButton action={deleteDoacao} id={d.id} label="esta doação" />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
