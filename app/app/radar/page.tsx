import Link from 'next/link'
import { ChevronRight, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/format'
import { calcularScore, classificar, leadQuenteReforma, potencialMensal, LABEL_STATUS_RADAR } from '@/lib/radar'
import { createRadarCliente } from '../actions'
import { PageHeader, Card, ListCard, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'

export default async function RadarPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data: clientes } = await supabase
    .from('radar_clientes')
    .select('id, nome, n_imoveis, patrimonio, renda_aluguel_anual, socio_pj, recebe_dividendos, n_herdeiros, status, updated_at, notes')
    .order('updated_at', { ascending: false })

  const lista = (clientes ?? [])
    .map((c) => {
      const score = calcularScore(c)
      const classe = classificar(score)
      return { ...c, score, classe, quente: leadQuenteReforma(c) }
    })
    .sort((a, b) => b.score - a.score)

  const ativos = lista.filter((c) => c.status !== 'descartado')
  const quentes = ativos.filter((c) => c.quente).length
  const potencial = ativos
    .filter((c) => !['fechado'].includes(c.status))
    .reduce((acc, c) => acc + potencialMensal(c.classe), 0)

  // pipeline: agrupa por estágio da conversa (o log do escritório)
  const ESTAGIOS: { chave: string; cor: string }[] = [
    { chave: 'novo', cor: 'bg-ink-soft/50' },
    { chave: 'abordado', cor: 'bg-sky-500' },
    { chave: 'diagnostico', cor: 'bg-gold' },
    { chave: 'proposta', cor: 'bg-amber-500' },
    { chave: 'fechado', cor: 'bg-emerald-600' },
  ]
  const porEstagio = new Map(ESTAGIOS.map((e) => [e.chave, ativos.filter((c) => c.status === e.chave)]))
  const descartados = lista.filter((c) => c.status === 'descartado').length

  return (
    <div>
      <PageHeader
        eyebrow="Log do escritório"
        title="Radar de Oportunidades"
        description="O log da sua prospecção: cada cliente da carteira num estágio da conversa, do primeiro contato ao fechamento. O sistema qualifica pelos sinais da DIRPF e prioriza quem vale o papo agora."
      />

      {ativos.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Resumo rotulo="No pipeline" valor={String(ativos.length)} />
          <Resumo rotulo="Leads quentes da Reforma" valor={String(quentes)} destaque={quentes > 0} />
          <Resumo rotulo="Potencial de honorários" valor={`${formatarMoeda(potencial)}/mês`} />
        </div>
      )}

      <Card className="p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label htmlFor="nome">Cliente</Label>
            <input id="nome" name="nome" required placeholder="Ex.: Roberto Andrade" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="n_imoveis">Nº de imóveis</Label>
            <input id="n_imoveis" name="n_imoveis" type="number" min="0" placeholder="4" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="n_herdeiros">Nº de herdeiros</Label>
            <input id="n_herdeiros" name="n_herdeiros" type="number" min="0" placeholder="3" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="patrimonio">Patrimônio declarado (R$)</Label>
            <input id="patrimonio" name="patrimonio" type="number" step="0.01" min="0" placeholder="4000000" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="renda_aluguel_anual">Aluguéis/ano (R$)</Label>
            <input id="renda_aluguel_anual" name="renda_aluguel_anual" type="number" step="0.01" min="0" placeholder="300000" className={fieldClass} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
            <input type="checkbox" name="socio_pj" className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
            Sócio de PJ
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
            <input type="checkbox" name="recebe_dividendos" className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
            Recebe dividendos
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <SubmitButton action={createRadarCliente}>Qualificar cliente</SubmitButton>
            <span className="ml-3 text-xs text-ink-soft">Ou crie só com o nome e importe as DIRPFs da família (titular + cônjuge) na página do cliente.</span>
          </div>
        </form>
        {searchParams?.error && <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
      </Card>

      <div className="mt-6 space-y-5">
        {ativos.length === 0 ? (
          <EmptyState>Nenhum cliente no pipeline ainda. Comece pelos clientes com imóveis na PF e sócios de PJ.</EmptyState>
        ) : (
          ESTAGIOS.map((e) => {
            const clientes = porEstagio.get(e.chave) ?? []
            if (clientes.length === 0) return null
            return (
              <div key={e.chave}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${e.cor}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy">{LABEL_STATUS_RADAR[e.chave]}</h3>
                  <span className="text-xs text-ink-soft">{clientes.length}</span>
                </div>
                <ListCard>
                  {clientes.map((c) => (
                    <Link key={c.id} href={`/app/radar/${c.id}`} className="flex items-center gap-3 px-5 py-3.5 text-sm transition hover:bg-surface">
                      <ScoreBadge score={c.score} classe={c.classe} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold text-ink">
                          {c.nome}
                          {c.quente && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                              <Flame size={11} /> lead quente da Reforma
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-soft">
                          {c.n_imoveis} imóveis · {formatarMoeda(Number(c.patrimonio))} · aluguéis {formatarMoeda(Number(c.renda_aluguel_anual))}/ano
                        </div>
                        {c.notes && <div className="mt-0.5 truncate text-xs italic text-ink-soft">“{c.notes}”</div>}
                      </div>
                      <span className="hidden text-[11px] text-ink-soft sm:block">{tempoRelativo(c.updated_at)}</span>
                      <ChevronRight size={16} className="text-ink-soft" />
                    </Link>
                  ))}
                </ListCard>
              </div>
            )
          })
        )}
        {descartados > 0 && (
          <p className="text-xs text-ink-soft">{descartados} cliente(s) descartado(s) — ocultos do pipeline.</p>
        )}
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Valores são estimativas de cenário para conversa comercial. ITCMD varia por estado; o cálculo
        definitivo é seu; instrumentos jurídicos são do advogado parceiro.
      </p>
    </div>
  )
}

function tempoRelativo(iso: string | null): string {
  if (!iso) return ''
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
}

function Resumo({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{rotulo}</div>
      <div className={`num mt-1 text-lg font-bold ${destaque ? 'text-red-700' : 'text-ink'}`}>{valor}</div>
    </Card>
  )
}

function ScoreBadge({ score, classe }: { score: number; classe: string }) {
  const cor = classe === 'ALTA' ? 'bg-emerald-600' : classe === 'MÉDIA' ? 'bg-gold' : 'bg-ink-soft/60'
  return (
    <span className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-white ${cor}`}>
      <span className="num text-sm font-bold leading-none">{score}</span>
      <span className="text-[8px] font-semibold uppercase leading-tight">{classe}</span>
    </span>
  )
}
