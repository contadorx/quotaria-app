import Link from 'next/link'
import { Users, X } from 'lucide-react'

// Chip "filtrando por Família X · limpar". `base` é a rota sem query (ex.: /app/calendario).
export function FiltroFamiliaChip({ nome, base }: { nome: string; base: string }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy/5 px-3 py-1.5 text-sm">
      <Users size={14} className="text-navy" />
      <span className="text-ink">Filtrando por <strong className="text-navy">{nome}</strong></span>
      <Link href={base} className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-ink-soft transition hover:text-ink">
        <X size={13} /> limpar
      </Link>
    </div>
  )
}
