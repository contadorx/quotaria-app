'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

function dataBr(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function LeituraIA({ radarId, inicial, inicialEm }: { radarId: string; inicial?: string | null; inicialEm?: string | null }) {
  const [carregando, setCarregando] = useState(false)
  const [texto, setTexto] = useState(inicial ?? '')
  const [em, setEm] = useState(inicialEm ?? '')
  const [erro, setErro] = useState('')

  async function gerar() {
    setErro(''); setCarregando(true)
    try {
      const res = await fetch('/api/radar/leitura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: radarId }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) setErro(data.erro ?? 'Não foi possível gerar a leitura.')
      else { setTexto(data.texto ?? ''); setEm(data.em ?? '') }
    } catch {
      setErro('Falha de conexão ao gerar a leitura.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="rounded-xl2 border border-gold/40 bg-gradient-to-br from-cream/60 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-gold"><Sparkles size={16} /></span>
          <div>
            <h3 className="text-sm font-bold text-navy">Leitura do consultor (IA)</h3>
            <p className="text-xs text-ink-muted">Interpreta os números acima e sugere prioridades e pontos para a reunião.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={gerar}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-60"
        >
          {carregando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {texto ? 'Gerar de novo' : 'Gerar leitura'}
        </button>
      </div>

      {erro && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      {texto && (
        <>
          <div className="mt-4 space-y-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{texto}</div>
          {em && <p className="mt-3 text-[11px] text-ink-soft">Gerada em {dataBr(em)}.</p>}
        </>
      )}

      <p className="mt-3 text-[11px] text-ink-soft">
        Gerado por IA a partir dos números estimados acima. São estimativas de cenário (variam por estado, data e caso);
        a redação de instrumentos é do advogado e o cálculo definitivo, do contador. Revise antes de usar com a família.
      </p>
    </div>
  )
}
