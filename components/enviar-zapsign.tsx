'use client'

import { useState } from 'react'
import { Send, Loader2, ExternalLink, Copy } from 'lucide-react'

type Params = {
  holdingId: string
  tipo: string
  exercicio?: number
  competencia?: string
  valorTotal?: number
  dataReuniao?: string
  proporcional?: boolean
}

export function EnviarZapSign({ params }: { params: Params }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [links, setLinks] = useState<{ name: string; sign_url: string }[]>([])
  const [erro, setErro] = useState('')

  async function enviar() {
    setEstado('enviando')
    setErro('')
    try {
      const res = await fetch('/api/assinatura/zapsign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErro(data.erro ?? 'Falha no envio.')
        setEstado('erro')
        return
      }
      setLinks(data.signers ?? [])
      setEstado('ok')
    } catch {
      setErro('Sem conexão. Tente novamente.')
      setEstado('erro')
    }
  }

  if (estado === 'ok') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Enviado ao ZapSign ✓</p>
        <p className="mt-0.5 text-xs text-emerald-700">
          Quem tem e-mail cadastrado já recebeu o convite. Para os demais, use os links abaixo:
        </p>
        <ul className="mt-2 space-y-1.5">
          {links.map((l, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-ink">{l.name}</span>
              {l.sign_url ? (
                <>
                  <a href={l.sign_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy underline-offset-2 hover:underline">
                    abrir <ExternalLink size={12} />
                  </a>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(l.sign_url)} className="inline-flex items-center gap-1 text-ink-soft hover:text-ink">
                    copiar <Copy size={12} />
                  </button>
                </>
              ) : (
                <span className="text-ink-soft">convite por e-mail</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-ink-soft">
          Ao concluir, baixe o documento assinado no ZapSign e arquive-o no cofre desta holding.
        </p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={enviar}
        disabled={estado === 'enviando'}
        className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-60"
      >
        {estado === 'enviando' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        Enviar para assinatura (ZapSign)
      </button>
      {estado === 'erro' && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  )
}
