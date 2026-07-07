'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

export function AbrirFaturaButton({ variant = 'primary' }: { variant?: 'primary' | 'link' }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function abrir() {
    setErro('')
    setCarregando(true)
    try {
      const res = await fetch('/api/assinatura/fatura')
      const data = await res.json()
      if (data.invoiceUrl) window.open(data.invoiceUrl, '_blank', 'noopener')
      else setErro(data.erro ?? 'Fatura ainda não disponível.')
    } catch {
      setErro('Sem conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  if (variant === 'link') {
    return (
      <button type="button" onClick={abrir} disabled={carregando} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
        {carregando ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />} abrir fatura
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={abrir}
        disabled={carregando}
        className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-60"
      >
        {carregando ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
        Reabrir fatura para pagar
      </button>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  )
}
