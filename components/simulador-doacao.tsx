'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Card, Label, fieldClass } from '@/components/ui'

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function SimuladorDoacao({ patrimonioInicial }: { patrimonioInicial: number }) {
  const [mercado, setMercado] = useState(patrimonioInicial || 2_000_000)
  const [contabil, setContabil] = useState(Math.round((patrimonioInicial || 2_000_000) * 0.55))
  const [aliqAtual, setAliqAtual] = useState(4)
  const [aliqFutura, setAliqFutura] = useState(8)
  const [donatarios, setDonatarios] = useState(2)
  const [isencaoAnual, setIsencaoAnual] = useState(0)
  const [anos, setAnos] = useState(5)

  const custoAgoraBens = (mercado * aliqAtual) / 100
  const baseFaseada = Math.max(0, mercado - isencaoAnual * donatarios * anos)
  const custoFaseado = (baseFaseada * aliqAtual) / 100
  const custoQuotasJanela = (contabil * aliqAtual) / 100
  const custoJanelaFechada = (mercado * aliqFutura) / 100
  const custoEsperar = custoJanelaFechada - custoQuotasJanela

  const cenarios = [
    {
      nome: 'Bens diretos, tudo agora',
      base: `Base: valor de mercado (${brl(mercado)})`,
      custo: custoAgoraBens,
      nota: 'Doação direta dos bens, avaliada a mercado na maioria das UFs.',
    },
    {
      nome: `Faseado em ${anos} anos`,
      base: isencaoAnual > 0 ? `Abate ${brl(isencaoAnual)}/ano × ${donatarios} donatário(s)` : 'Sem isenção anual informada',
      custo: custoFaseado,
      nota: 'Exposto a mudanças de alíquota/base durante o período.',
    },
    {
      nome: 'Via quotas AGORA (a janela)',
      base: `Base: valor contábil (${brl(contabil)})`,
      custo: custoQuotasJanela,
      destaque: true,
      nota: 'Doação de quotas pelo valor contábil — o cenário que o PLP 108 ameaça.',
    },
    {
      nome: 'Se a janela fechar',
      base: `Base: mercado · alíquota ${aliqFutura}%`,
      custo: custoJanelaFechada,
      alerta: true,
      nota: 'Quotas avaliadas a mercado + progressividade (teto 8%, EC 132).',
    },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Calculator size={16} className="text-navy" />
        <h3 className="text-sm font-semibold text-ink">Simulador de cenários de doação</h3>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Compare os caminhos lado a lado com as <strong className="font-semibold text-ink">suas</strong> premissas
        — o sistema registra as alíquotas que você informa, não apura tributo.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <div className="sm:col-span-1 lg:col-span-2">
          <Label htmlFor="sim_mercado">Valor de mercado (R$)</Label>
          <input id="sim_mercado" type="number" min={0} value={mercado} onChange={(e) => setMercado(Number(e.target.value))} className={fieldClass} />
        </div>
        <div className="sm:col-span-1 lg:col-span-2">
          <Label htmlFor="sim_contabil">Valor contábil (R$)</Label>
          <input id="sim_contabil" type="number" min={0} value={contabil} onChange={(e) => setContabil(Number(e.target.value))} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="sim_aliq">ITCMD hoje %</Label>
          <input id="sim_aliq" type="number" min={0} max={8} step={0.5} value={aliqAtual} onChange={(e) => setAliqAtual(Number(e.target.value))} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="sim_fut">Cenário futuro %</Label>
          <input id="sim_fut" type="number" min={0} max={8} step={0.5} value={aliqFutura} onChange={(e) => setAliqFutura(Number(e.target.value))} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="sim_don">Donatários</Label>
          <input id="sim_don" type="number" min={1} value={donatarios} onChange={(e) => setDonatarios(Number(e.target.value))} className={fieldClass} />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="sim_ise">Isenção anual/donatário (R$)</Label>
          <input id="sim_ise" type="number" min={0} value={isencaoAnual} onChange={(e) => setIsencaoAnual(Number(e.target.value))} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="sim_anos">Anos (faseado)</Label>
          <input id="sim_anos" type="number" min={1} max={15} value={anos} onChange={(e) => setAnos(Number(e.target.value))} className={fieldClass} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cenarios.map((c) => (
          <div
            key={c.nome}
            className={`rounded-xl2 border p-4 ${
              c.destaque ? 'border-gold bg-cream/50' : c.alerta ? 'border-red-200 bg-red-50/60' : 'border-line bg-white'
            }`}
          >
            <div className="text-xs font-semibold text-ink">{c.nome}</div>
            <div className={`num mt-1.5 text-xl font-bold ${c.alerta ? 'text-red-700' : 'text-navy'}`}>{brl(c.custo)}</div>
            <div className="mt-1 text-[11px] text-ink-muted">{c.base}</div>
            <div className="mt-1.5 text-[11px] leading-snug text-ink-soft">{c.nota}</div>
          </div>
        ))}
      </div>

      {custoEsperar > 0 && (
        <p className="mt-4 rounded-lg bg-navy px-4 py-3 text-sm font-medium text-white">
          Adiar pode custar <span className="num font-bold text-gold-soft">{brl(custoEsperar)}</span> — a diferença
          entre doar quotas pelo valor contábil hoje e doar pela base de mercado no cenário futuro.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        Estimativas de cenário para a conversa com a família. Alíquotas, isenções e base de cálculo variam por
        estado e mudam com a tramitação do PLP 108; o cálculo definitivo é do contador e os instrumentos
        (doação, cláusulas, escritura) são redigidos pelo advogado.
      </p>
    </Card>
  )
}
