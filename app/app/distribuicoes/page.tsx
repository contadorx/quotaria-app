import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, formatarMoeda, LABEL_TIPO_DISTRIBUICAO } from '@/lib/format'
import { createDistribuicao, deleteDistribuicao } from '../actions'
import { PageHeader, Card, EmptyState, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'

export default async function DistribuicoesPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: holdings } = await supabase
    .from('holdings').select('id, razao_social').order('razao_social')

  const { data: distribuicoes } = await supabase
    .from('distribuicoes')
    .select('id, holding_id, competencia, valor_total, tipo, proporcional, deliberacao, data_deliberacao')
    .order('competencia', { ascending: false })

  const nomePorHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))
  const temHoldings = (holdings ?? []).length > 0
  const total = (distribuicoes ?? []).reduce((acc, d) => acc + Number(d.valor_total), 0)

  return (
    <div>
      <PageHeader
        eyebrow="Defesa fiscal"
        title="Distribuições"
        description="Registro de distribuições de lucros com a deliberação que as sustenta. Desproporcional sem deliberação é flanco — o sistema avisa."
      />

      {!temHoldings ? (
        <EmptyState>
          Cadastre uma holding antes de registrar distribuições.{' '}
          <Link href="/app" className="font-semibold text-navy underline-offset-2 hover:underline">
            Ir para Famílias →
          </Link>
        </EmptyState>
      ) : (
        <>
          <Card className="p-5">
            <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Label htmlFor="holding_id">Holding</Label>
                <select id="holding_id" name="holding_id" required className={fieldClass}>
                  {(holdings ?? []).map((h) => <option key={h.id} value={h.id}>{h.razao_social}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="competencia">Competência</Label>
                <input id="competencia" name="competencia" type="date" required className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="valor_total">Valor total</Label>
                <input id="valor_total" name="valor_total" type="number" step="0.01" min="0" placeholder="120000" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <select id="tipo" name="tipo" className={fieldClass}>
                  {Object.entries(LABEL_TIPO_DISTRIBUICAO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="deliberacao">Deliberação</Label>
                <input id="deliberacao" name="deliberacao" placeholder="Ex.: Ata de reunião de sócios" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="data_deliberacao">Data da deliberação</Label>
                <input id="data_deliberacao" name="data_deliberacao" type="date" className={fieldClass} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2 lg:col-span-3">
                <input type="checkbox" name="proporcional" defaultChecked className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                Proporcional às quotas (desmarque se a distribuição foi desproporcional)
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <SubmitButton action={createDistribuicao}>Registrar distribuição</SubmitButton>
              </div>
            </form>
            {searchParams?.error && (
              <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>
            )}
          </Card>

          {!distribuicoes || distribuicoes.length === 0 ? (
            <div className="mt-6">
              <EmptyState>Nenhuma distribuição registrada ainda.</EmptyState>
            </div>
          ) : (
            <>
              <div className="mt-8 flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Registradas <span className="text-ink-soft">({distribuicoes.length})</span>
                </h2>
                <span className="text-sm text-ink-muted">
                  Total: <span className="num font-semibold text-ink">{formatarMoeda(total)}</span>
                </span>
              </div>

              <Card className="mt-3 divide-y divide-line overflow-hidden">
                {distribuicoes.map((d) => {
                  const flanco = !d.proporcional && !d.deliberacao
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                      <span className="w-20 shrink-0 tabular-nums text-ink-muted">
                        {formatarDataISO(d.competencia)}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-ink">
                          {nomePorHolding.get(d.holding_id) ?? 'holding'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                          <Pill>{LABEL_TIPO_DISTRIBUICAO[d.tipo]}</Pill>
                          {d.proporcional ? (
                            <span className="text-ink-soft">proporcional</span>
                          ) : (
                            <span className="font-medium text-amber-700">desproporcional</span>
                          )}
                          {d.deliberacao ? (
                            <span>· {d.deliberacao}{d.data_deliberacao ? ` (${formatarDataISO(d.data_deliberacao)})` : ''}</span>
                          ) : flanco ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                              <AlertTriangle size={12} /> sem deliberação registrada
                            </span>
                          ) : (
                            <span className="text-ink-soft">· sem deliberação</span>
                          )}
                        </div>
                      </div>
                      <span className="num font-semibold text-ink">{formatarMoeda(Number(d.valor_total))}</span>
                      <DeleteButton action={deleteDistribuicao} id={d.id} label="esta distribuição" />
                    </div>
                  )
                })}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
