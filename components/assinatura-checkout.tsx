'use client'

import { useMemo, useState } from 'react'
import { Check, Loader2, ExternalLink } from 'lucide-react'
import { PLANOS, CICLOS, precoCiclo, LABEL_STATUS_ASSINATURA, type PlanoId } from '@/lib/planos'
import type { Ciclo } from '@/lib/asaas'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
}

export function AssinaturaCheckout({
  statusInicial,
  planoInicial,
  cicloInicial,
  temAssinatura,
  proximoVencimento,
}: {
  statusInicial: string
  planoInicial: PlanoId | null
  cicloInicial: Ciclo | null
  temAssinatura: boolean
  proximoVencimento: string | null
}) {
  const [plano, setPlano] = useState<PlanoId>(planoInicial ?? 'profissional')
  const [ciclo, setCiclo] = useState<Ciclo>(cicloInicial ?? 'mensal')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [billingType, setBillingType] = useState('PIX')
  const [carregando, setCarregando] = useState<'assinar' | 'fatura' | null>(null)
  const [erro, setErro] = useState('')

  const planoAtual = useMemo(() => PLANOS.find((p) => p.id === plano)!, [plano])
  const preco = useMemo(() => precoCiclo(planoAtual.valor, ciclo), [planoAtual, ciclo])

  const ativa = statusInicial === 'ativa'
  const pendente = statusInicial === 'pendente'
  const inadimplente = statusInicial === 'inadimplente'

  async function assinar() {
    setErro('')
    const doc = cpfCnpj.replace(/\D/g, '')
    if (doc.length !== 11 && doc.length !== 14) {
      setErro('Informe um CPF ou CNPJ válido.')
      return
    }
    setCarregando('assinar')
    try {
      const res = await fetch('/api/assinatura/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, ciclo, cpfCnpj: doc, billingType }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErro(data.erro ?? 'Não foi possível criar a assinatura.')
        return
      }
      if (data.invoiceUrl) window.location.href = data.invoiceUrl
      else window.location.reload()
    } catch {
      setErro('Sem conexão. Tente novamente.')
    } finally {
      setCarregando(null)
    }
  }

  async function abrirFatura() {
    setErro('')
    setCarregando('fatura')
    try {
      const res = await fetch('/api/assinatura/fatura')
      const data = await res.json()
      if (data.invoiceUrl) window.open(data.invoiceUrl, '_blank', 'noopener')
      else setErro(data.erro ?? 'Fatura ainda não disponível.')
    } catch {
      setErro('Sem conexão. Tente novamente.')
    } finally {
      setCarregando(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* status atual */}
      <div className={`rounded-xl2 border px-4 py-3 text-sm ${
        ativa ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : inadimplente ? 'border-red-200 bg-red-50 text-red-800'
        : pendente ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-line bg-surface text-ink'
      }`}>
        <span className="font-semibold">{LABEL_STATUS_ASSINATURA[statusInicial] ?? statusInicial}</span>
        {ativa && proximoVencimento && <span> · próximo vencimento em {proximoVencimento.slice(0, 10).split('-').reverse().join('/')}</span>}
        {(pendente || inadimplente) && temAssinatura && (
          <button type="button" onClick={abrirFatura} disabled={carregando === 'fatura'} className="ml-2 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
            {carregando === 'fatura' ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />} abrir fatura
          </button>
        )}
      </div>

      {/* planos */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PLANOS.map((p) => {
          const sel = p.id === plano
          const pc = precoCiclo(p.valor, ciclo)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlano(p.id)}
              className={`rounded-xl2 border p-4 text-left transition ${sel ? 'border-navy ring-2 ring-navy/15' : 'border-line hover:border-gold'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-navy">{p.nome}</span>
                {p.destaque && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold-deep">popular</span>}
              </div>
              <p className="mt-1 text-2xl font-extrabold text-ink">
                {brl(ciclo === 'anual' ? pc.valorMensalEquivalente : p.valor)}
                <span className="text-xs font-medium text-ink-soft">/mês</span>
              </p>
              {ciclo === 'anual' && <p className="text-[11px] text-emerald-700">{brl(pc.valorCiclo)}/ano · 2 meses grátis</p>}
              <p className="mt-2 text-xs text-ink-muted">{p.descricao}</p>
              <ul className="mt-2 space-y-1">
                {p.destaques.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-ink"><Check size={12} className="mt-0.5 shrink-0 text-emerald-600" />{d}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* ciclo */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Ciclo</p>
        <div className="flex gap-2">
          {CICLOS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCiclo(c.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${ciclo === c.id ? 'border-navy bg-navy text-white' : 'border-line text-ink-muted hover:bg-surface'}`}
            >
              {c.nome}{c.nota && <span className={`ml-1 text-[11px] ${ciclo === c.id ? 'text-cream' : 'text-emerald-700'}`}>· {c.nota}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* pagamento */}
      <div className="grid gap-4 rounded-xl2 border border-line bg-surface/50 p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cpfCnpj" className="text-xs font-medium text-ink-muted">CPF ou CNPJ do titular</label>
          <input
            id="cpfCnpj"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            placeholder="somente números"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="billingType" className="text-xs font-medium text-ink-muted">Forma de pagamento</label>
          <select
            id="billingType"
            value={billingType}
            onChange={(e) => setBillingType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="PIX">PIX</option>
            <option value="BOLETO">Boleto</option>
            <option value="CREDIT_CARD">Cartão de crédito</option>
            <option value="UNDEFINED">Deixar o cliente escolher</option>
          </select>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm text-ink">
            <span className="font-bold text-navy">{brl(preco.valorCiclo)}</span>
            <span className="text-ink-soft"> {ciclo === 'anual' ? 'por ano' : 'por mês'}</span>
          </p>
          <button
            type="button"
            onClick={assinar}
            disabled={carregando === 'assinar'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-60"
          >
            {carregando === 'assinar' && <Loader2 size={15} className="animate-spin" />}
            {ativa || pendente ? 'Atualizar plano' : 'Assinar e pagar'}
          </button>
        </div>
        {erro && <p className="text-sm text-red-600 sm:col-span-2">{erro}</p>}
      </div>

      <p className="text-[11px] text-ink-soft">
        Pagamento processado pelo Asaas. Sua assinatura fica ativa assim que o pagamento é confirmado —
        você pode acompanhar o status aqui e reabrir a fatura a qualquer momento.
      </p>
    </div>
  )
}
