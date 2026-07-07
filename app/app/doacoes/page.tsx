import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, formatarMoeda, LABEL_STATUS_DOACAO } from '@/lib/format'
import { createDoacao, changeStatusDoacao, deleteDoacao } from '../actions'
import { PageHeader, Card, EmptyState, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'

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
}

export default async function DoacoesPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: holdings } = await supabase.from('holdings').select('id, razao_social').order('razao_social')
  const { data: socios } = await supabase.from('socios').select('id, nome, family_id').order('nome')
  const { data: families } = await supabase.from('families').select('id, name')
  const { data: doacoes } = await supabase
    .from('doacoes')
    .select('id, holding_id, doador_id, donatario_id, quantidade_quotas, valor_estimado, itcmd_estimado, com_reserva_usufruto, data_prevista, status, cartorio')
    .order('data_prevista', { nullsFirst: false })

  const nomeFamilia = new Map((families ?? []).map((f) => [f.id, f.name]))
  const nomePorHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))
  const socioLabel = new Map(
    (socios ?? []).map((s) => [s.id, `${s.nome}${nomeFamilia.get(s.family_id) ? ` · ${nomeFamilia.get(s.family_id)}` : ''}`]),
  )
  const socioNome = new Map((socios ?? []).map((s) => [s.id, s.nome]))

  const temHoldings = (holdings ?? []).length > 0
  const lista = (doacoes ?? []) as Doacao[]

  const planejadas = lista.filter((d) => d.status === 'planejada')
  const emCartorio = lista.filter((d) => d.status === 'em_cartorio')
  const concluidas = lista.filter((d) => d.status === 'concluida')
  const itcmdTotal = lista.reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)
  const transferido = concluidas.reduce((a, d) => a + Number(d.valor_estimado ?? 0), 0)

  return (
    <div>
      <PageHeader
        eyebrow="Sucessão"
        title="Doações"
        description="Cronograma de doação de quotas em vida — o ritmo que realiza a economia de ITCMD e inventário prometida na proposta."
      />

      {!temHoldings ? (
        <EmptyState>
          Cadastre uma holding e seus sócios antes de planejar doações.{' '}
          <Link href="/app" className="font-semibold text-navy underline-offset-2 hover:underline">Ir para Famílias →</Link>
        </EmptyState>
      ) : (
        <>
          <Card className="p-5">
            <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label htmlFor="holding_id">Holding</Label>
                <select id="holding_id" name="holding_id" required className={fieldClass}>
                  {(holdings ?? []).map((h) => <option key={h.id} value={h.id}>{h.razao_social}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="doador_id">Doador</Label>
                <select id="doador_id" name="doador_id" className={fieldClass}>
                  <option value="">—</option>
                  {(socios ?? []).map((s) => <option key={s.id} value={s.id}>{socioLabel.get(s.id)}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="donatario_id">Donatário</Label>
                <select id="donatario_id" name="donatario_id" className={fieldClass}>
                  <option value="">—</option>
                  {(socios ?? []).map((s) => <option key={s.id} value={s.id}>{socioLabel.get(s.id)}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="quantidade_quotas">Quotas</Label>
                <input id="quantidade_quotas" name="quantidade_quotas" type="number" step="0.0001" min="0" placeholder="250" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="valor_estimado">Valor estimado</Label>
                <input id="valor_estimado" name="valor_estimado" type="number" step="0.01" min="0" placeholder="300000" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="itcmd_estimado">ITCMD estimado</Label>
                <input id="itcmd_estimado" name="itcmd_estimado" type="number" step="0.01" min="0" placeholder="12000" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="data_prevista">Data prevista</Label>
                <input id="data_prevista" name="data_prevista" type="date" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" className={fieldClass}>
                  {Object.entries(LABEL_STATUS_DOACAO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="cartorio">Cartório (opcional)</Label>
                <input id="cartorio" name="cartorio" placeholder="Ex.: 2º Tabelião de Notas" className={fieldClass} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2 lg:col-span-4">
                <input type="checkbox" name="com_reserva_usufruto" className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                Com reserva de usufruto (doa a nua-propriedade, mantém o usufruto)
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <SubmitButton action={createDoacao}>Adicionar ao cronograma</SubmitButton>
              </div>
            </form>
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
                  {d.com_reserva_usufruto && <Pill>reserva de usufruto</Pill>}
                  {d.cartorio ? <span>· {d.cartorio}</span> : null}
                </div>
              </div>
              <div className="hidden text-right sm:block">
                {d.valor_estimado != null && <div className="num text-ink">{formatarMoeda(Number(d.valor_estimado))}</div>}
                {d.itcmd_estimado != null && <div className="num text-xs text-ink-soft">ITCMD {formatarMoeda(Number(d.itcmd_estimado))}</div>}
              </div>
              <form action={changeStatusDoacao}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="to" value={prox.to} />
                <button className="whitespace-nowrap rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink">
                  {prox.label}
                </button>
              </form>
              <DeleteButton action={deleteDoacao} id={d.id} label="esta doação" />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
