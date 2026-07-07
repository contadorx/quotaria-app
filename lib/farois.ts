// Faróis — o "o que fazer" por família. Cruza os módulos e devolve pendências
// acionáveis, cada uma apontando para a tela já filtrada por aquela família.
import type { SupabaseClient } from '@supabase/supabase-js'

export type EstadoFarol = 'ok' | 'atencao' | 'alerta'
export type Farol = {
  chave: string
  label: string
  estado: EstadoFarol
  count: number
  href: string
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

// Pendências de UMA família (para o cockpit da tela da família).
export async function faroisDaFamilia(
  supabase: SupabaseClient,
  familyId: string,
  holdingIds: string[],
): Promise<Farol[]> {
  const fam = `?fam=${familyId}`
  const out: Farol[] = []

  // sem holding ainda → o primeiro passo é cadastrar
  if (holdingIds.length === 0) {
    out.push({ chave: 'holding', label: 'Cadastrar a primeira holding', estado: 'atencao', count: 1, href: `/app/familias/${familyId}` })
    return out
  }

  const hoje = hojeISO()

  const [{ data: eventos }, { data: doacoes }, { data: distrib }, { data: conf }] = await Promise.all([
    supabase.from('eventos').select('id, data_prevista, status').in('holding_id', holdingIds).eq('status', 'pendente'),
    supabase.from('doacoes').select('id, data_prevista, status, adiada_em').in('holding_id', holdingIds),
    supabase.from('distribuicoes').select('id, deliberacao, data_deliberacao').in('holding_id', holdingIds),
    supabase.from('conformidade_reforma').select('holding_id, nfse_cbs, clausula_repasse, credito_locatario, redutor_social, regime_caixa').in('holding_id', holdingIds),
  ])

  const evVencidos = (eventos ?? []).filter((e) => e.data_prevista && e.data_prevista <= hoje).length
  if (evVencidos > 0) out.push({ chave: 'calendario', label: evVencidos === 1 ? '1 compromisso vencido no calendário' : `${evVencidos} compromissos vencidos no calendário`, estado: 'alerta', count: evVencidos, href: `/app/calendario${fam}` })

  const doaAtrasadas = (doacoes ?? []).filter((d) => d.status === 'planejada' && d.data_prevista && d.data_prevista < hoje && !d.adiada_em).length
  if (doaAtrasadas > 0) out.push({ chave: 'doacoes', label: doaAtrasadas === 1 ? '1 doação atrasada no cronograma' : `${doaAtrasadas} doações atrasadas no cronograma`, estado: 'alerta', count: doaAtrasadas, href: `/app/doacoes${fam}` })

  const distSemAta = (distrib ?? []).filter((d) => !(d.deliberacao && d.deliberacao.trim()) && !d.data_deliberacao).length
  if (distSemAta > 0) out.push({ chave: 'distribuicoes', label: distSemAta === 1 ? '1 distribuição sem deliberação registrada' : `${distSemAta} distribuições sem deliberação`, estado: 'atencao', count: distSemAta, href: `/app/distribuicoes${fam}` })

  // conformidade: holdings sem registro ou com itens faltando
  const confPorHolding = new Map((conf ?? []).map((c) => [c.holding_id, c]))
  let confIncompleta = 0
  for (const hid of holdingIds) {
    const c = confPorHolding.get(hid)
    if (!c) { confIncompleta++; continue }
    const itens = [c.nfse_cbs, c.clausula_repasse, c.credito_locatario, c.redutor_social, c.regime_caixa]
    if (itens.some((v) => !v)) confIncompleta++
  }
  if (confIncompleta > 0) out.push({ chave: 'conformidade', label: confIncompleta === 1 ? '1 holding com conformidade da Reforma pendente' : `${confIncompleta} holdings com conformidade pendente`, estado: 'atencao', count: confIncompleta, href: `/app/familias/${familyId}` })

  return out
}

// Contagem de pendências por família (para os badges do menu Famílias) —
// em lote, sem N+1: puxa tudo do escritório (RLS já isola) e agrupa por família.
export async function pendenciasPorFamilia(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const hoje = hojeISO()
  const { data: holdings } = await supabase.from('holdings').select('id, family_id')
  const famDe = new Map((holdings ?? []).map((h) => [h.id as string, h.family_id as string]))

  const [{ data: eventos }, { data: doacoes }, { data: distrib }] = await Promise.all([
    supabase.from('eventos').select('holding_id, data_prevista, status').eq('status', 'pendente'),
    supabase.from('doacoes').select('holding_id, data_prevista, status, adiada_em'),
    supabase.from('distribuicoes').select('holding_id, deliberacao, data_deliberacao'),
  ])

  const acc = new Map<string, number>()
  const bump = (holdingId: string | null) => {
    if (!holdingId) return
    const fam = famDe.get(holdingId)
    if (!fam) return
    acc.set(fam, (acc.get(fam) ?? 0) + 1)
  }

  for (const e of eventos ?? []) if (e.data_prevista && e.data_prevista <= hoje) bump(e.holding_id)
  for (const d of doacoes ?? []) if (d.status === 'planejada' && d.data_prevista && d.data_prevista < hoje && !d.adiada_em) bump(d.holding_id)
  for (const d of distrib ?? []) if (!(d.deliberacao && String(d.deliberacao).trim()) && !d.data_deliberacao) bump(d.holding_id)

  return acc
}
