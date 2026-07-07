'use client'

import { useState } from 'react'
import { Search, Loader2, Check, AlertCircle } from 'lucide-react'
import { Label, fieldClass } from '@/components/ui'
import { mascaraDocumento, apenasDigitos, cnpjValido } from '@/lib/documento'

export function HoldingIdentidade({
  defaults,
}: {
  defaults?: { razaoSocial?: string; nomeFantasia?: string; tipoSocietario?: string; cnpj?: string }
}) {
  const [razao, setRazao] = useState(defaults?.razaoSocial ?? '')
  const [fantasia, setFantasia] = useState(defaults?.nomeFantasia ?? '')
  const [tipo, setTipo] = useState(defaults?.tipoSocietario ?? 'ltda')
  const [cnpj, setCnpj] = useState(defaults?.cnpj ? mascaraDocumento(defaults.cnpj) : '')
  const [buscando, setBuscando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const digitos = apenasDigitos(cnpj)
  const podeConsultar = digitos.length === 14 && cnpjValido(digitos)

  async function buscar() {
    if (!podeConsultar) {
      setFeedback({ tipo: 'erro', msg: 'Informe um CNPJ válido para consultar.' })
      return
    }
    setBuscando(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/cnpj/${digitos}`)
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ tipo: 'erro', msg: data.erro ?? 'Não foi possível consultar.' })
        return
      }
      if (data.razaoSocial) setRazao(data.razaoSocial)
      if (data.nomeFantasia) setFantasia(data.nomeFantasia)
      setFeedback({ tipo: 'ok', msg: data.situacao ? `Encontrado · ${data.municipio}/${data.uf} · ${data.situacao}` : 'Dados preenchidos.' })
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Sem conexão com a base da Receita. Preencha manualmente.' })
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* CNPJ primeiro — a consulta preenche o resto */}
      <div className="sm:col-span-2">
        <Label htmlFor="cnpj">CNPJ (opcional — consulte para preencher)</Label>
        <div className="flex gap-2">
          <input
            id="cnpj"
            name="cnpj"
            value={cnpj}
            onChange={(e) => { setCnpj(mascaraDocumento(e.target.value)); setFeedback(null) }}
            placeholder="00.000.000/0001-00"
            inputMode="numeric"
            className={fieldClass}
          />
          <button
            type="button"
            onClick={buscar}
            disabled={buscando || !podeConsultar}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-navy transition hover:border-gold disabled:opacity-50"
          >
            {buscando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
          </button>
        </div>
        {feedback && (
          <p className={`mt-1 flex items-center gap-1 text-xs ${feedback.tipo === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {feedback.tipo === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {feedback.msg}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="razao_social">Razão social</Label>
        <input id="razao_social" name="razao_social" value={razao} onChange={(e) => setRazao(e.target.value)} required placeholder="Ex.: Andrade Participações Ltda" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="nome_fantasia">Nome fantasia (opcional)</Label>
        <input id="nome_fantasia" name="nome_fantasia" value={fantasia} onChange={(e) => setFantasia(e.target.value)} placeholder="Ex.: Andrade Participações" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="tipo_societario">Tipo</Label>
        <select id="tipo_societario" name="tipo_societario" value={tipo} onChange={(e) => setTipo(e.target.value)} className={fieldClass}>
          <option value="ltda">Ltda</option>
          <option value="sa">S/A</option>
        </select>
      </div>
    </div>
  )
}
