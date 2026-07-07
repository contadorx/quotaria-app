import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { salvarFechamento } from '../actions'
import { PageHeader, Card, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'
import { FiltroFamiliaChip } from '@/components/filtro-familia-chip'
import { EditDialog } from '@/components/edit-dialog'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const ITENS: { campo: string; label: string }[] = [
  { campo: 'distribuicoes_ok', label: 'Distribuições do mês deliberadas e registradas' },
  { campo: 'documentos_ok', label: 'Documentos do mês arquivados no cofre' },
  { campo: 'alertas_ok', label: 'Alertas e prazos do mês tratados' },
  { campo: 'alugueis_ok', label: 'Aluguéis marcados para regime de caixa' },
  { campo: 'doacoes_ok', label: 'Cronograma de doações em dia' },
]

type Fechamento = {
  holding_id: string
  distribuicoes_ok: boolean
  documentos_ok: boolean
  alertas_ok: boolean
  alugueis_ok: boolean
  doacoes_ok: boolean
  notes: string | null
}

function semaforo(f: Fechamento | undefined) {
  if (!f) return { cor: 'off', label: 'Não iniciado', dot: 'bg-ink-soft/40' }
  const n = [f.distribuicoes_ok, f.documentos_ok, f.alertas_ok, f.alugueis_ok, f.doacoes_ok].filter(Boolean).length
  if (n === 5) return { cor: 'emerald', label: 'Em dia', dot: 'bg-emerald-500' }
  if (n >= 3) return { cor: 'gold', label: `${n}/5 · pendências`, dot: 'bg-gold' }
  return { cor: 'red', label: `${n}/5 · atenção`, dot: 'bg-red-500' }
}

export default async function MesPage({
  searchParams,
}: {
  searchParams: { ano?: string; mes?: string; error?: string; fam?: string }
}) {
  const hoje = new Date()
  const ano = Number(searchParams.ano) || hoje.getFullYear()
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1
  const mm = String(mes).padStart(2, '0')
  const competencia = `${ano}-${mm}-01`
  const prefixo = `${ano}-${mm}`
  const hojeISO = hoje.toISOString().slice(0, 10)

  const prev = mes === 1 ? { a: ano - 1, m: 12 } : { a: ano, m: mes - 1 }
  const next = mes === 12 ? { a: ano + 1, m: 1 } : { a: ano, m: mes + 1 }

  const supabase = createClient()
  const famId = searchParams?.fam
  const { data: famRow } = famId
    ? await supabase.from('families').select('name').eq('id', famId).maybeSingle()
    : { data: null }
  const { data: holdingsRaw } = await supabase.from('holdings').select('id, razao_social, family_id').order('razao_social')
  const holdings = (holdingsRaw ?? []).filter((h) => !famId || h.family_id === famId)
  const { data: fechs } = await supabase
    .from('fechamentos').select('holding_id, distribuicoes_ok, documentos_ok, alertas_ok, alugueis_ok, doacoes_ok, notes')
    .eq('competencia', competencia)

  // auto-detecção: sinais dos lançamentos reais do mês
  const { data: distrib } = await supabase.from('distribuicoes').select('holding_id, competencia')
  const comDist = new Set((distrib ?? []).filter((d) => d.competencia?.slice(0, 7) === prefixo).map((d) => d.holding_id))
  const { data: docs } = await supabase.from('documentos').select('holding_id, competencia, created_at')
  const comDoc = new Set(
    (docs ?? []).filter((d) => (d.competencia?.slice(0, 7) ?? d.created_at.slice(0, 7)) === prefixo && d.holding_id).map((d) => d.holding_id),
  )
  const { data: evPend } = await supabase.from('eventos').select('holding_id, data_prevista').eq('status', 'pendente')
  const comVencido = new Set((evPend ?? []).filter((e) => e.data_prevista < hojeISO && e.holding_id).map((e) => e.holding_id))

  // cronograma de doações: avisa, não pune — adiamento deliberado silencia
  const { data: doaPlan } = await supabase
    .from('doacoes').select('holding_id, data_prevista, adiada_em').eq('status', 'planejada')
  const doacoesInfo = (hid: string) => {
    const da = (doaPlan ?? []).filter((d) => d.holding_id === hid)
    return {
      atrasadas: da.filter((d) => d.data_prevista && d.data_prevista < hojeISO && !d.adiada_em).length,
      adiadas: da.filter((d) => d.adiada_em).length,
    }
  }

  const porHolding = new Map((fechs ?? []).map((f) => [f.holding_id, f as Fechamento]))
  const lista = (holdings ?? []).map((h) => ({ h, f: porHolding.get(h.id), s: semaforo(porHolding.get(h.id)) }))
  const emDia = lista.filter((x) => x.s.cor === 'emerald').length
  const pend = lista.filter((x) => x.s.cor === 'gold' || x.s.cor === 'red').length
  const naoIniciado = lista.filter((x) => x.s.cor === 'off').length

  function sugestao(hid: string): Record<string, boolean> {
    return {
      distribuicoes_ok: comDist.has(hid),
      documentos_ok: comDoc.has(hid),
      alertas_ok: !comVencido.has(hid),
      alugueis_ok: false,
      doacoes_ok: doacoesInfo(hid).atrasadas === 0,
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pulso mensal"
        title="O Mês da Holding"
        description="O fechamento guiado de cada holding. Os itens já vêm pré-marcados a partir dos lançamentos do mês — você revisa e salva."
      />

      {famId && <FiltroFamiliaChip nome={famRow?.name ?? 'Família'} base="/app/mes" />}

      <div className="mb-6 flex items-center justify-between">
        <Link href={`/app/mes?ano=${prev.a}&mes=${prev.m}`} className="flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink-muted transition hover:bg-surface">
          <ChevronLeft size={16} /> {MESES[prev.m - 1]}
        </Link>
        <div className="text-center">
          <div className="text-lg font-bold capitalize text-ink">{MESES[mes - 1]} de {ano}</div>
          {(holdings ?? []).length > 0 && (
            <div className="mt-0.5 text-xs text-ink-soft">{emDia} em dia · {pend} com pendências · {naoIniciado} a iniciar</div>
          )}
        </div>
        <Link href={`/app/mes?ano=${next.a}&mes=${next.m}`} className="flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink-muted transition hover:bg-surface">
          {MESES[next.m - 1]} <ChevronRight size={16} />
        </Link>
      </div>

      {searchParams?.error && <p className="mb-4 text-sm font-medium text-red-600">{searchParams.error}</p>}

      {(holdings ?? []).length === 0 ? (
        <EmptyState>
          Cadastre uma holding para começar os fechamentos.{' '}
          <Link href="/app" className="font-semibold text-navy underline-offset-2 hover:underline">Ir para Famílias →</Link>
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {lista.map(({ h, f, s }) => {
            const sug = sugestao(h.id)
            return (
              <div key={h.id} className="flex items-center gap-3 px-5 py-4">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                <span className="flex-1 font-medium text-ink">{h.razao_social}</span>
                <span className={`text-xs ${s.cor === 'red' ? 'font-medium text-red-700' : s.cor === 'emerald' ? 'text-emerald-700' : 'text-ink-muted'}`}>{s.label}</span>
                <Link href={`/app/mes/${h.id}?ano=${ano}&mes=${mes}`} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink">Extrato</Link>
                <EditDialog title={`Fechamento · ${MESES[mes - 1]}/${ano}`} label={f ? 'Revisar' : 'Fechar mês'}>
                  <form className="space-y-4">
                    <input type="hidden" name="holding_id" value={h.id} />
                    <input type="hidden" name="competencia" value={competencia} />
                    <p className="text-sm font-medium text-ink">{h.razao_social}</p>
                    {!f && (
                      <p className="rounded-lg bg-cream/60 px-3 py-2 text-xs text-ink-muted">
                        Pré-marcado pelo sistema a partir dos lançamentos do mês. Revise e salve.
                      </p>
                    )}
                    <div className="space-y-2.5">
                      {ITENS.map((it) => (
                        <label key={it.campo} className="flex items-start gap-2.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            name={it.campo}
                            defaultChecked={f ? (f[it.campo as keyof Fechamento] as boolean) : sug[it.campo]}
                            className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-gold"
                          />
                          <span>
                            {it.label}
                            {it.campo === 'doacoes_ok' && doacoesInfo(h.id).atrasadas > 0 && (
                              <span className="mt-0.5 block text-xs font-medium text-amber-700">
                                {doacoesInfo(h.id).atrasadas} doação(ões) planejada(s) vencida(s) sem decisão registrada —{' '}
                                <Link href="/app/doacoes" className="underline underline-offset-2">reagende ou registre o adiamento</Link>. Você pode marcar mesmo assim.
                              </span>
                            )}
                            {it.campo === 'doacoes_ok' && doacoesInfo(h.id).atrasadas === 0 && doacoesInfo(h.id).adiadas > 0 && (
                              <span className="mt-0.5 block text-xs text-ink-soft">
                                {doacoesInfo(h.id).adiadas} adiada(s) por decisão registrada.
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor={`notes_${h.id}`}>Observação do mês (opcional)</Label>
                      <textarea id={`notes_${h.id}`} name="notes" rows={2} defaultValue={f?.notes ?? ''} className={fieldClass} />
                    </div>
                    <div className="flex justify-end"><SubmitButton action={salvarFechamento}>Salvar fechamento</SubmitButton></div>
                  </form>
                </EditDialog>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
