'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(text)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      prompt('Copie o link:', text)
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
    >
      {copiado ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      {copiado ? 'Copiado' : 'Copiar link'}
    </button>
  )
}
