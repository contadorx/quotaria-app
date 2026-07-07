'use client'

import { useRef, useState } from 'react'
import { Bot, Loader2, Send, User } from 'lucide-react'
import { Card } from '@/components/ui'

type ChatMsg = { autor: 'usuario' | 'ia'; texto: string }

export function ChatSuporte() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [escalada, setEscalada] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  async function enviar() {
    const m = texto.trim()
    if (!m || enviando) return
    setTexto('')
    setMsgs((atual) => [...atual, { autor: 'usuario', texto: m }])
    setEnviando(true)
    try {
      const res = await fetch('/api/suporte-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversaId, mensagem: m }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        conversaId?: string
        resposta?: string
        escalar?: boolean
        erro?: string
      }
      if (!res.ok || !data.ok) {
        setMsgs((atual) => [
          ...atual,
          { autor: 'ia', texto: data.erro ?? 'Algo deu errado. Tente de novo em instantes.' },
        ])
      } else {
        if (data.conversaId) setConversaId(data.conversaId)
        setMsgs((atual) => [...atual, { autor: 'ia', texto: data.resposta ?? '' }])
        if (data.escalar) setEscalada(true)
      }
    } catch {
      setMsgs((atual) => [
        ...atual,
        { autor: 'ia', texto: 'Sem conexão agora. Tente novamente em instantes.' },
      ])
    } finally {
      setEnviando(false)
      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
    }
  }

  return (
    <Card className="flex h-[440px] flex-col p-0">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Bot size={16} className="text-gold-deep" />
        <p className="text-sm font-semibold text-ink">Assistente do Quotaria</p>
        {escalada && (
          <span className="ml-auto rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-navy">
            Encaminhado à equipe
          </span>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <p className="pt-10 text-center text-sm text-ink-soft">
            Pergunte sobre qualquer tela ou rotina do sistema.
            <br />
            Ex.: &ldquo;como registro um adiamento de doação?&rdquo;
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.autor === 'usuario' ? 'justify-end' : ''}`}>
            {m.autor === 'ia' && (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                <Bot size={13} />
              </span>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                m.autor === 'usuario' ? 'bg-navy text-white' : 'bg-surface text-ink'
              }`}
            >
              {m.texto}
            </div>
            {m.autor === 'usuario' && (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-navy">
                <User size={13} />
              </span>
            )}
          </div>
        ))}
        {enviando && (
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 size={14} className="animate-spin" /> Pensando…
          </div>
        )}
        <div ref={fimRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="Escreva a sua dúvida…"
          className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-gold"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send size={16} />
        </button>
      </div>
    </Card>
  )
}
