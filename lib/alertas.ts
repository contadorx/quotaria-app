// Pendências de UMA organização, para o cron de alertas.
//
// Por que não reusar `agendaDoEscritorio` (lib/farois): aquela função depende da
// RLS para isolar o escritório (não filtra organização). O cron roda com
// service-role, onde a RLS não se aplica — então aqui o filtro por
// organization_id é EXPLÍCITO em toda query. Não troque isso por conveniência:
// sem o filtro, um escritório receberia as pendências dos outros.

import type { SupabaseClient } from '@supabase/supabase-js'

export type PendenciaAlerta = {
  chave: string // id estável, usado no hash de deduplicação
  texto: string
  quando: string | null // ISO
  atrasado: boolean
}

const DIAS_ANTECEDENCIA = 7

function dataBr(iso: string | null) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export async function pendenciasDaOrg(
  admin: SupabaseClient,
  orgId: string,
  hojeISO: string,
): Promise<PendenciaAlerta[]> {
  const limite = new Date(hojeISO + 'T00:00:00Z')
  limite.setUTCDate(limite.getUTCDate() + DIAS_ANTECEDENCIA)
  const limiteISO = limite.toISOString().slice(0, 10)

  const [{ data: holdings }, { data: eventos }, { data: doacoes }, { data: atividades }] = await Promise.all([
    admin.from('holdings').select('id, razao_social').eq('organization_id', orgId),
    admin
      .from('eventos')
      .select('id, holding_id, titulo, data_prevista')
      .eq('organization_id', orgId)
      .eq('status', 'pendente')
      .lte('data_prevista', limiteISO),
    admin
      .from('doacoes')
      .select('id, holding_id, data_prevista, status')
      .eq('organization_id', orgId)
      .neq('status', 'concluida')
      .not('data_prevista', 'is', null)
      .lt('data_prevista', hojeISO),
    admin
      .from('radar_atividades')
      .select('id, descricao, vence_em, radar_id')
      .eq('organization_id', orgId)
      .is('concluida_em', null)
      .not('vence_em', 'is', null)
      .lte('vence_em', hojeISO),
  ])

  const nomeHolding = new Map((holdings ?? []).map((h) => [h.id as string, h.razao_social as string]))
  const itens: PendenciaAlerta[] = []

  for (const e of eventos ?? []) {
    const venc = e.data_prevista as string | null
    const atrasado = !!venc && venc < hojeISO
    const onde = e.holding_id ? ` — ${nomeHolding.get(e.holding_id as string) ?? 'holding'}` : ''
    itens.push({
      chave: `ev-${e.id}`,
      texto: `${e.titulo}${onde} ${atrasado ? `(vencido em ${dataBr(venc)})` : `(vence em ${dataBr(venc)})`}`,
      quando: venc,
      atrasado,
    })
  }

  for (const d of doacoes ?? []) {
    const venc = d.data_prevista as string | null
    itens.push({
      chave: `doa-${d.id}`,
      texto: `Doação atrasada — ${nomeHolding.get(d.holding_id as string) ?? 'holding'} (prevista para ${dataBr(venc)})`,
      quando: venc,
      atrasado: true,
    })
  }

  for (const a of atividades ?? []) {
    const venc = a.vence_em as string | null
    const atrasado = !!venc && venc < hojeISO
    itens.push({
      chave: `atv-${a.id}`,
      texto: `Radar — ${a.descricao ?? 'atividade de venda'} ${atrasado ? `(atrasada desde ${dataBr(venc)})` : '(para hoje)'}`,
      quando: venc,
      atrasado,
    })
  }

  // atrasados primeiro, depois por data
  itens.sort((x, y) => Number(y.atrasado) - Number(x.atrasado) || (x.quando ?? '').localeCompare(y.quando ?? ''))
  return itens
}

// Hash estável do conjunto de pendências (para não repetir o mesmo e-mail).
export function hashPendencias(itens: PendenciaAlerta[]): string {
  return itens.map((i) => i.chave).sort().join('|')
}
