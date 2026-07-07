import Link from 'next/link'
import { ChevronRight, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/format'
import { calcularScore, classificar, leadQuenteReforma, potencialMensal, LABEL_STATUS_RADAR } from '@/lib/radar'
import { createRadarCliente } from '../actions'
import { PageHeader, Card, ListCard, EmptyState, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'

export default async function RadarPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data: clientes } = await supabase
    .from('radar_clientes')
    .select('id, nome, n_imoveis, patrimonio, renda_aluguel_anual, socio_pj, recebe_dividendos, n_herdeiros, status')
    .neq('status', 'descartado')
    .order('created_at', { ascending: false })

  const lista = (clientes ?? [])
    .map((c) => {
      const score = calcularScore(c)
      const classe = classificar(score)
      return { ...c, score, classe, quente: leadQuenteReforma(c) }
    })
    .sort((a, b) => b.score - a.score)

  const quentes = lista.filter((c) => c.quente).length
  const potencial = lista
    .filter((c) => !['fechado'].includes(c.status))
    .reduce((acc, c) => acc + potencialMensal(c.classe), 0)

  return (
    <div>
      <PageHeader
        eyebrow="Aquisição"
        title="Radar de Oportunidades"
        description="A Mina de Ouro da sua carteira: informe os 6 sinais da DIRPF de cada cliente e o sistema qualifica, prioriza e monta o argumentário de venda."
      />

      {lista.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Resumo rotulo="No radar" valor={String(lista.length)} />
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
            <span className="ml-3 text-xs text-ink-soft">Ou crie só com o nome e importe a DIRPF (PDF) na página do cliente.</span>
          </div>
        </form>
        {searchParams?.error && <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
      </Card>

      <div className="mt-6">
        {lista.length === 0 ? (
          <EmptyState>Nenhum cliente qualificado ainda. Comece pelos clientes com imóveis na PF e sócios de PJ.</EmptyState>
        ) : (
          <ListCard>
            {lista.map((c) => (
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
                </div>
                <Pill>{LABEL_STATUS_RADAR[c.status]}</Pill>
                <ChevronRight size={16} className="text-ink-soft" />
              </Link>
            ))}
          </ListCard>
        )}
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Valores são estimativas de cenário para conversa comercial. ITCMD varia por estado; o cálculo
        definitivo é seu; instrumentos jurídicos são do advogado parceiro.
      </p>
    </div>
  )
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
