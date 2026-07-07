import Link from 'next/link'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { pendenciasPorFamilia } from '@/lib/farois'
import { formatarData, formatarDataISO, formatarMoeda } from '@/lib/format'
import { createFamily, deleteFamily } from './actions'
import { PageHeader, Card, ListCard, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'

export default async function AppHome({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: families } = await supabase.from('families').select('id, name, created_at').order('created_at', { ascending: false })
  const pendencias = await pendenciasPorFamilia(supabase)
  const { data: holdings } = await supabase.from('holdings').select('id')
  const { data: bens } = await supabase.from('bens').select('valor_contabil, valor_mercado')
  const { data: eventos } = await supabase.from('eventos').select('data_prevista, status').eq('status', 'pendente')
  const { data: doacoes } = await supabase.from('doacoes').select('itcmd_estimado, status').eq('status', 'concluida')
  const { data: doaPlan } = await supabase.from('doacoes').select('data_prevista, adiada_em').eq('status', 'planejada')

  const hoje = new Date().toISOString().slice(0, 10)
  const hoje30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const mm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  const { data: fechs } = await supabase
    .from('fechamentos')
    .select('distribuicoes_ok, documentos_ok, alertas_ok, alugueis_ok, doacoes_ok')
    .eq('competencia', mm)

  const nFamilias = (families ?? []).length
  const nHoldings = (holdings ?? []).length
  const patrimonio = (bens ?? []).reduce((a, b) => a + Number(b.valor_mercado ?? b.valor_contabil ?? 0), 0)
  const atrasados = (eventos ?? []).filter((e) => e.data_prevista < hoje)
  const proximos = (eventos ?? []).filter((e) => e.data_prevista >= hoje && e.data_prevista <= hoje30)
  const emDiaMes = (fechs ?? []).filter((f) => f.distribuicoes_ok && f.documentos_ok && f.alertas_ok && f.alugueis_ok && f.doacoes_ok).length
  const doacoesAtrasadas = (doaPlan ?? []).filter((d) => d.data_prevista && d.data_prevista < hoje && !d.adiada_em).length
  const itcmdEconomizado = (doacoes ?? []).reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)

  return (
    <div>
      <PageHeader eyebrow="Painel" title="Sua carteira" description="A infraestrutura do honorário premium — o pulso de todas as famílias num lugar." />

      {/* indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric rotulo="Famílias" valor={String(nFamilias)} />
        <Metric rotulo="Holdings" valor={String(nHoldings)} />
        <Metric rotulo="Patrimônio registrado" valor={formatarMoeda(patrimonio)} />
        <Metric rotulo="ITCMD economizado" valor={formatarMoeda(itcmdEconomizado)} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {/* alertas */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Alertas</h2>
            <Link href="/app/calendario" className="text-xs text-ink-soft transition hover:text-navy">Calendário →</Link>
          </div>
          {atrasados.length === 0 && proximos.length === 0 && doacoesAtrasadas === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Nada vencido nem nos próximos 30 dias.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {atrasados.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700">
                  <AlertTriangle size={15} /> {atrasados.length} atrasado{atrasados.length > 1 ? 's' : ''}
                </span>
              )}
              {proximos.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-3 py-2 font-medium text-navy">
                  {proximos.length} nos próximos 30 dias
                </span>
              )}
              {doacoesAtrasadas > 0 && (
                <Link href="/app/doacoes" className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 transition hover:bg-red-100">
                  <AlertTriangle size={15} /> {doacoesAtrasadas} doaç{doacoesAtrasadas > 1 ? 'ões' : 'ão'} do cronograma atrasada{doacoesAtrasadas > 1 ? 's' : ''}
                </Link>
              )}
            </div>
          )}
        </Card>
        {/* saúde do mês */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Mês corrente</h2>
            <Link href="/app/mes" className="text-xs text-ink-soft transition hover:text-navy">Fechamentos →</Link>
          </div>
          <div className="mt-3 text-sm text-ink">
            <span className="num text-2xl font-bold text-navy">{emDiaMes}</span>
            <span className="text-ink-muted"> / {nHoldings} holdings em dia</span>
          </div>
        </Card>
      </div>

      {/* famílias */}
      <div className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Famílias</h2>
        <Card className="p-5">
          <form className="flex flex-wrap items-end gap-3">
            <div className="grow">
              <Label htmlFor="name">Nova família</Label>
              <input id="name" name="name" required placeholder="Ex.: Família Andrade" className={fieldClass} />
            </div>
            <SubmitButton action={createFamily}>Adicionar</SubmitButton>
          </form>
          {searchParams?.error && <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
        </Card>

        <div className="mt-4">
          {!families || families.length === 0 ? (
            <EmptyState>Nenhuma família cadastrada ainda.</EmptyState>
          ) : (
            <ListCard>
              {families.map((f) => (
                <div key={f.id} className="flex items-center gap-2 px-5 py-4 transition hover:bg-surface">
                  <Link href={`/app/familias/${f.id}`} className="flex flex-1 items-center justify-between">
                    <span className="font-semibold text-ink">{f.name}</span>
                    <span className="mr-3 flex items-center gap-3 text-xs text-ink-soft">
                      {pendencias.get(f.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          {pendencias.get(f.id)} {pendencias.get(f.id) === 1 ? 'pendência' : 'pendências'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          em dia
                        </span>
                      )}
                      <ChevronRight size={16} />
                    </span>
                  </Link>
                  <DeleteButton action={deleteFamily} id={f.id} label={`a família "${f.name}" e tudo dentro dela`} />
                </div>
              ))}
            </ListCard>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{rotulo}</div>
      <div className="num mt-1 text-xl font-bold text-ink">{valor}</div>
    </Card>
  )
}
