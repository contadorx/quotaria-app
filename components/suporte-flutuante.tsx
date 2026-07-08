'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, User, MessageSquareText, X, Sparkles } from 'lucide-react'

type ChatMsg = { autor: 'usuario' | 'ia'; texto: string }

export function SuporteFlutuante() {
  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [escalada, setEscalada] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) {
      fimRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [msgs, aberto])

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
      const data = (await res.json()) as { ok?: boolean; conversaId?: string; resposta?: string; escalar?: boolean; erro?: string }
      if (!res.ok || !data.ok) {
        setMsgs((atual) => [...atual, { autor: 'ia', texto: data.erro ?? 'Algo deu errado. Tente de novo em instantes.' }])
      } else {
        if (data.conversaId) setConversaId(data.conversaId)
        setMsgs((atual) => [...atual, { autor: 'ia', texto: data.resposta ?? '' }])
        if (data.escalar) setEscalada(true)
      }
    } catch {
      setMsgs((atual) => [...atual, { autor: 'ia', texto: 'Sem conexão agora. Tente novamente em instantes.' }])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="no-print">
      {/* botão flutuante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-xl ring-4 ring-navy/10 transition hover:scale-105 hover:bg-navy-soft"
          aria-label="Abrir ajuda"
          title="Ajuda"
        >
          <MessageSquareText size={24} />
        </button>
      )}

      {/* painel */}
      {aberto && (
        <div className="fixed bottom-6 right-6 z-[60] flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-xl2 border border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 bg-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <span className="text-sm font-semibold">Assistente Quotaria</span>
            </div>
            <button onClick={() => setAberto(false)} className="text-white/70 transition hover:text-white" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-surface px-4 py-4">
            {msgs.length === 0 && (
              <div className="rounded-xl border border-line bg-white p-3 text-sm text-ink-muted">
                Olá! Posso ajudar com o uso do sistema — cadastro, fechamento do mês, doações, relatórios, convite da família. Como posso ajudar?
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.autor === 'usuario' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.autor === 'usuario' ? 'bg-gold/20 text-gold-deep' : 'bg-navy text-white'}`}>
                  {m.autor === 'usuario' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.autor === 'usuario' ? 'bg-navy text-white' : 'border border-line bg-white text-ink'}`}>
                  {m.texto}
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white"><Bot size={14} /></div>
                <div className="rounded-xl border border-line bg-white px-3 py-2 text-ink-soft"><Loader2 size={15} className="animate-spin" /></div>
              </div>
            )}
            {escalada && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Encaminhei sua mensagem para a equipe — alguém retorna por e-mail.
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <div className="flex items-end gap-2 border-t border-line bg-white p-3">
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder="Escreva sua dúvida…"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <button onClick={enviar} disabled={enviando || !texto.trim()} className="shrink-0 rounded-lg bg-navy p-2 text-white transition hover:bg-navy-soft disabled:opacity-50" aria-label="Enviar">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
