'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, Check } from 'lucide-react'

export function PortalUpload({ familyId, solicitacaoId, label }: { familyId: string; solicitacaoId?: string; label?: string }) {
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function enviar() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setErro('Escolha um arquivo.'); return }
    setErro(''); setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('family_id', familyId)
      if (solicitacaoId) fd.append('solicitacao_id', solicitacaoId)
      fd.append('file', file)
      const res = await fetch('/api/portal/enviar-documento', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.ok) setErro(data.erro ?? 'Falha ao enviar.')
      else { setOk(true); if (fileRef.current) fileRef.current.value = '' }
    } catch {
      setErro('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }

  if (ok) return <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><Check size={15} /> {label ? 'Enviado' : 'Documento enviado'}</span>

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" className="text-xs text-ink-muted file:mr-2 file:rounded-md file:border file:border-line file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold" />
      <button type="button" onClick={enviar} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-soft disabled:opacity-60">
        {enviando ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Enviar
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  )
}
