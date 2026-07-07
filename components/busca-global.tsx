'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Users, Building2, User, Radar as RadarIcon } from 'lucide-react'

type Resultados = {
  familias: { id: string; name: string }[]
  holdings: { id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null }[]
  socios: { id: string; nome: string; family_id: string }[]
  radar: { id: string; nome: string }[]
}

const VAZIO: Resultados = { familias: [], holdings: [], socios: [], radar: [] }

export function BuscaGlobal() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Resultados>(VAZIO)
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // fecha ao clicar fora
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  // busca com debounce
  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(VAZIO)
      return
    }
    setCarregando(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(q.trim())}`)
        const data = await r.json()
        setRes({ familias: data.familias ?? [], holdings: data.holdings ?? [], socios: data.socios ?? [], radar: data.radar ?? [] })
        setAberto(true)
      } catch {
        setRes(VAZIO)
      } finally {
        setCarregando(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [q])

  const total = res.familias.length + res.holdings.length + res.socios.length + res.radar.length

  function ir(href: string) {
    setAberto(false)
    setQ('')
    router.push(href)
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 focus-within:border-gold">
        {carregando ? <Loader2 size={15} className="animate-spin text-ink-soft" /> : <Search size={15} className="text-ink-soft" />}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => total > 0 && setAberto(true)}
          placeholder="Buscar família, holding, sócio, cliente…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
      </div>

      {aberto && q.trim().length >= 2 && (
        <div className="absolute z-40 mt-1.5 w-full min-w-[320px] overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          {total === 0 && !carregando ? (
            <p className="px-4 py-3 text-sm text-ink-soft">Nada encontrado para “{q.trim()}”.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-1">
              <Grupo titulo="Famílias" Icon={Users} itens={res.familias.map((f) => ({ id: f.id, label: f.name, href: `/app/familias/${f.id}` }))} onIr={ir} />
              <Grupo titulo="Holdings" Icon={Building2} itens={res.holdings.map((h) => ({ id: h.id, label: h.razao_social, sub: h.cnpj ?? h.nome_fantasia ?? undefined, href: `/app/holdings/${h.id}` }))} onIr={ir} />
              <Grupo titulo="Sócios" Icon={User} itens={res.socios.map((s) => ({ id: s.id, label: s.nome, href: `/app/familias/${s.family_id}` }))} onIr={ir} />
              <Grupo titulo="Radar" Icon={RadarIcon} itens={res.radar.map((r) => ({ id: r.id, label: r.nome, href: `/app/radar/${r.id}` }))} onIr={ir} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Grupo({
  titulo,
  Icon,
  itens,
  onIr,
}: {
  titulo: string
  Icon: typeof Users
  itens: { id: string; label: string; sub?: string; href: string }[]
  onIr: (href: string) => void
}) {
  if (itens.length === 0) return null
  return (
    <div className="py-1">
      <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{titulo}</p>
      {itens.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onIr(it.href)}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-surface"
        >
          <Icon size={14} className="shrink-0 text-ink-soft" />
          <span className="min-w-0 truncate text-ink">{it.label}</span>
          {it.sub && <span className="ml-auto truncate text-xs text-ink-soft">{it.sub}</span>}
        </button>
      ))}
    </div>
  )
}
