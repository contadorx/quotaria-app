import Link from 'next/link'
import { ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { pendenciasPorFamilia, agendaDoEscritorio } from '@/lib/farois'
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
  const agenda = await agendaDoEscritorio(supabase)
  const { data: holdings } = await supabase.from('holdings').select('id')
  const { data: bens } = await supabase.from('bens').select('valor_contabil, valor_mercado')
  const { data: eventos } = await supabase.from('eventos').select('data_prevista, status').eq('status', 'pendente')
  const { data: doacoes } = await supabase.from('doacoes').select('itcmd_estimado, status').eq('status', 'concluida')

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
  const proximos = (eventos ?? []).filter((e) => e.data_prevista >= hoje && e.data_prevista <= hoje30)
  const emDiaMes = (fechs ?? []).filter((f) => f.distribuicoes_ok && f.documentos_ok && f.alertas_ok && f.alugueis_ok && f.doacoes_ok).length
  const itcmdEconomizado = (doacoes ?? []).reduce((a, d) => a + Number(d.itcmd_estimado ?? 0), 0)

  return (
    <div>
      <PageHeader eyebrow="Painel" title="Sua carteira" description="A infraestrutura do honorário premium — o pulso de todas as famílias num lugar." />

      {/* O QUE PRECISA DE VOCÊ — a agenda do escritório */}
      <Card className="mb-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">O que precisa de você</h2>
          {agenda.length > 0 && (
            <span className="text-xs text-ink-soft">
              {agenda.filter((i) => i.estado === 'alerta').length} urgente(s) · {agenda.length} no total
            </span>
          )}
        </div>
        {agenda.length === 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={16} /> Carteira em dia — nada pendente na sua mão agora.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {agenda.slice(0, 12).map((i) => (
              <li key={i.id}>
                <Link
                  href={i.href}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition ${
                    i.estado === 'alerta' ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertTriangle size={15} className={`shrink-0 ${i.estado === 'alerta' ? 'text-red-600' : 'text-amber-600'}`} />
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{i.label}</span>
                      <span className="ml-2 text-xs text-ink-soft">{i.familia}{i.holding ? ` · ${i.holding}` : ''}</span>
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-soft" />
                </Link>
              </li>
            ))}
            {agenda.length > 12 && (
              <li className="pt-1 text-xs text-ink-soft">+ {agenda.length - 12} outros itens — resolva os de cima ou abra cada família.</li>
            )}
          </ul>
        )}
      </Card>

      {/* indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric rotulo="Famílias" valor={String(nFamilias)} />
        <Metric rotulo="Holdings" valor={String(nHoldings)} />
        <Metric rotulo="Patrimônio registrado" valor={formatarMoeda(patrimonio)} />
        <Metric rotulo="ITCMD economizado" valor={formatarMoeda(itcmdEconomizado)} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {/* próximos */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Próximos 30 dias</h2>
            <Link href="/app/calendario" className="text-xs text-ink-soft transition hover:text-navy">Calendário →</Link>
          </div>
          {proximos.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Nada nos próximos 30 dias. O que está vencido aparece em “O que precisa de você”, acima.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-3 py-2 font-medium text-navy">
                {proximos.length} compromisso{proximos.length > 1 ? 's' : ''} chegando
              </span>
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <form className="flex flex-wrap items-end gap-3">
              <div className="grow">
                <Label htmlFor="name">Nova família (rápido)</Label>
                <input id="name" name="name" required placeholder="Ex.: Família Andrade" className={fieldClass} />
              </div>
              <SubmitButton action={createFamily}>Adicionar</SubmitButton>
            </form>
            <Link href="/app/nova-familia" className="inline-flex items-center gap-1.5 rounded-lg border border-gold bg-gold/10 px-4 py-2 text-sm font-semibold text-gold-deep transition hover:bg-gold/20">
              Assistente completo →
            </Link>
          </div>
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
