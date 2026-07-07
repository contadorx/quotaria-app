'use client'

import { useMemo, useState } from 'react'
import { SubmitButton } from '@/components/submit-button'
import { Label, fieldClass } from '@/components/ui'
import { createDoacao } from '@/app/app/actions'
import { LABEL_STATUS_DOACAO } from '@/lib/format'

type Holding = { id: string; razao_social: string; family_id: string }
type Socio = { id: string; nome: string; family_id: string }
type Familia = { id: string; name: string }

export function FormNovaDoacao({
  holdings,
  socios,
  familias,
}: {
  holdings: Holding[]
  socios: Socio[]
  familias: Familia[]
}) {
  const [holdingId, setHoldingId] = useState(holdings[0]?.id ?? '')

  const nomeFamilia = useMemo(() => new Map(familias.map((f) => [f.id, f.name])), [familias])
  const familyDaHolding = useMemo(
    () => new Map(holdings.map((h) => [h.id, h.family_id])),
    [holdings],
  )

  const familyId = familyDaHolding.get(holdingId) ?? ''
  const sociosDaFamilia = useMemo(
    () => socios.filter((s) => s.family_id === familyId),
    [socios, familyId],
  )

  return (
    <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <Label htmlFor="holding_id">Holding</Label>
        <select
          id="holding_id"
          name="holding_id"
          required
          value={holdingId}
          onChange={(e) => setHoldingId(e.target.value)}
          className={fieldClass}
        >
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>
              {h.razao_social}
              {nomeFamilia.get(h.family_id) ? ` · ${nomeFamilia.get(h.family_id)}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="doador_id">Doador</Label>
        <select id="doador_id" name="doador_id" className={fieldClass}>
          <option value="">—</option>
          {sociosDaFamilia.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="donatario_id">Donatário</Label>
        <select id="donatario_id" name="donatario_id" className={fieldClass}>
          <option value="">—</option>
          {sociosDaFamilia.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>

      {sociosDaFamilia.length === 0 && (
        <p className="text-xs text-amber-700 sm:col-span-2 lg:col-span-4">
          Esta família ainda não tem sócios cadastrados — cadastre-os na família antes de definir doador e donatário.
        </p>
      )}

      <div>
        <Label htmlFor="quantidade_quotas">Quotas</Label>
        <input id="quantidade_quotas" name="quantidade_quotas" type="number" step="0.0001" min="0" placeholder="250" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="valor_estimado">Valor estimado</Label>
        <input id="valor_estimado" name="valor_estimado" type="number" step="0.01" min="0" placeholder="300000" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="itcmd_estimado">ITCMD estimado</Label>
        <input id="itcmd_estimado" name="itcmd_estimado" type="number" step="0.01" min="0" placeholder="12000" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="data_prevista">Data prevista</Label>
        <input id="data_prevista" name="data_prevista" type="date" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" className={fieldClass}>
          {Object.entries(LABEL_STATUS_DOACAO).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="lg:col-span-2">
        <Label htmlFor="cartorio">Cartório (opcional)</Label>
        <input id="cartorio" name="cartorio" placeholder="Ex.: 2º Tabelião de Notas" className={fieldClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2 lg:col-span-4">
        <input type="checkbox" name="com_reserva_usufruto" className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
        Com reserva de usufruto (doa a nua-propriedade, mantém o usufruto)
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton action={createDoacao}>Adicionar ao cronograma</SubmitButton>
      </div>
    </form>
  )
}
