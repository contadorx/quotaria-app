'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registrarDocumento } from '@/app/app/actions'
import { LABEL_TIPO_DOCUMENTO } from '@/lib/format'
import { Card, Label, fieldClass } from '@/components/ui'

function sanitize(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function UploadDocumento({
  pastaId,
  holdings,
}: {
  pastaId: string
  holdings: { id: string; razao_social: string }[]
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('outro')
  const [holdingId, setHoldingId] = useState('')
  const [competencia, setCompetencia] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar() {
    if (!file) {
      setErro('Selecione um arquivo.')
      return
    }
    setLoading(true)
    setErro('')
    try {
      const supabase = createClient()
      const path = `${pastaId}/${holdingId || 'geral'}/${crypto.randomUUID()}-${sanitize(file.name)}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file)
      if (upErr) {
        setErro('Falha no upload: ' + upErr.message)
        setLoading(false)
        return
      }
      const res = await registrarDocumento({
        nome: nome.trim() || file.name,
        tipo,
        holding_id: holdingId || null,
        storage_path: path,
        tamanho_bytes: file.size,
        competencia: competencia || null,
      })
      if (res?.error) {
        setErro(res.error)
        setLoading(false)
        return
      }
      setFile(null)
      setNome('')
      setCompetencia('')
      setTipo('outro')
      setHoldingId('')
      const input = document.getElementById('arquivo') as HTMLInputElement | null
      if (input) input.value = ''
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <Label htmlFor="arquivo">Arquivo</Label>
          <input
            id="arquivo"
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              if (f && !nome) setNome(f.name)
            }}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-navy-soft"
          />
        </div>
        <div>
          <Label htmlFor="doc_nome">Nome</Label>
          <input id="doc_nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Contrato social 2024" className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="doc_tipo">Tipo</Label>
          <select id="doc_tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={fieldClass}>
            {Object.entries(LABEL_TIPO_DOCUMENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="doc_holding">Holding (opcional)</Label>
          <select id="doc_holding" value={holdingId} onChange={(e) => setHoldingId(e.target.value)} className={fieldClass}>
            <option value="">Geral (carteira)</option>
            {holdings.map((h) => <option key={h.id} value={h.id}>{h.razao_social}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="doc_competencia">Competência (opcional)</Label>
          <input id="doc_competencia" type="date" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className={fieldClass} />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={enviar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-50"
          >
            <UploadCloud size={16} />
            {loading ? 'Enviando…' : 'Enviar ao cofre'}
          </button>
        </div>
      </div>
      {erro && <p className="mt-3 text-sm font-medium text-red-600">{erro}</p>}
    </Card>
  )
}
