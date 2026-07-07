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

// Agenda do escritório — a lista ACIONÁVEL de tudo que precisa de você hoje,
// na carteira inteira, ordenada por urgência. É o "hoje" do escritório.
export type ItemAgenda = {
  id: string
  tipo: 'calendario' | 'doacao' | 'distribuicao' | 'conformidade' | 'fechamento'
  label: string
  familia: string
  holding?: string
  href: string
  estado: EstadoFarol
  ordem: string
}

const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function compBr(iso: string) {
  const [a, m] = iso.slice(0, 10).split('-')
  return `${MESES_CURTO[Number(m) - 1]}/${a.slice(2)}`
}
function dataBr(iso: string) {
  return iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/')
}

export async function agendaDoEscritorio(supabase: SupabaseClient): Promise<ItemAgenda[]> {
  const hoje = hojeISO()
  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: holdings }, { data: families }] = await Promise.all([
    supabase.from('holdings').select('id, family_id, razao_social'),
    supabase.from('families').select('id, name'),
  ])
  const famNome = new Map((families ?? []).map((f) => [f.id as string, f.name as string]))
  const hInfo = new Map((holdings ?? []).map((h) => [h.id as string, { fam: h.family_id as string, razao: h.razao_social as string }]))
  const famDeHolding = (hid: string | null) => (hid ? famNome.get(hInfo.get(hid)?.fam ?? '') ?? 'Carteira' : 'Carteira')

  const [{ data: eventos }, { data: doacoes }, { data: distrib }, { data: bens }, { data: conf }, { data: fechs }] =
    await Promise.all([
      supabase.from('eventos').select('id, holding_id, titulo, data_prevista, status').eq('status', 'pendente'),
      supabase.from('doacoes').select('id, holding_id, data_prevista, status, adiada_em'),
      supabase.from('distribuicoes').select('id, holding_id, competencia, deliberacao, data_deliberacao'),
      supabase.from('bens').select('holding_id, gera_receita'),
      supabase.from('conformidade_reforma').select('holding_id, nfse_cbs, clausula_repasse, credito_locatario, redutor_social, regime_caixa'),
      supabase.from('fechamentos').select('holding_id, competencia').eq('competencia', mesAtual),
    ])

  const itens: ItemAgenda[] = []

  for (const e of eventos ?? []) {
    if (e.data_prevista && e.data_prevista <= hoje) {
      itens.push({
        id: `ev-${e.id}`, tipo: 'calendario', estado: 'alerta',
        label: `${e.titulo} — vencido em ${dataBr(e.data_prevista)}`,
        familia: famDeHolding(e.holding_id), holding: e.holding_id ? hInfo.get(e.holding_id)?.razao : undefined,
        href: e.holding_id ? `/app/calendario?fam=${hInfo.get(e.holding_id)?.fam}` : '/app/calendario',
        ordem: e.data_prevista,
      })
    }
  }
  for (const d of doacoes ?? []) {
    if (d.status === 'planejada' && d.data_prevista && d.data_prevista < hoje && !d.adiada_em) {
      itens.push({
        id: `doa-${d.id}`, tipo: 'doacao', estado: 'alerta',
        label: `Doação atrasada — prevista para ${dataBr(d.data_prevista)}`,
        familia: famDeHolding(d.holding_id), holding: d.holding_id ? hInfo.get(d.holding_id)?.razao : undefined,
        href: `/app/doacoes?fam=${hInfo.get(d.holding_id ?? '')?.fam ?? ''}`,
        ordem: d.data_prevista,
      })
    }
  }
  for (const d of distrib ?? []) {
    if (!(d.deliberacao && String(d.deliberacao).trim()) && !d.data_deliberacao) {
      itens.push({
        id: `dist-${d.id}`, tipo: 'distribuicao', estado: 'atencao',
        label: `Distribuição de ${compBr(d.competencia)} sem deliberação registrada`,
        familia: famDeHolding(d.holding_id), holding: hInfo.get(d.holding_id)?.razao,
        href: `/app/distribuicoes?fam=${hInfo.get(d.holding_id)?.fam ?? ''}`,
        ordem: d.competencia,
      })
    }
  }

  const temReceita = new Set((bens ?? []).filter((b) => b.gera_receita).map((b) => b.holding_id))
  const confPorHolding = new Map((conf ?? []).map((c) => [c.holding_id, c]))
  for (const hid of temReceita) {
    const c = confPorHolding.get(hid)
    const completa = c && [c.nfse_cbs, c.clausula_repasse, c.credito_locatario, c.redutor_social, c.regime_caixa].every(Boolean)
    if (!completa) {
      const info = hInfo.get(hid as string)
      itens.push({
        id: `conf-${hid}`, tipo: 'conformidade', estado: 'atencao',
        label: 'Conformidade da locação sob a Reforma pendente',
        familia: info ? famNome.get(info.fam) ?? 'Carteira' : 'Carteira', holding: info?.razao,
        href: info ? `/app/holdings/${hid}` : '/app',
        ordem: 'zzz',
      })
    }
  }

  const fechados = new Set((fechs ?? []).map((f) => f.holding_id))
  for (const [hid, info] of hInfo) {
    if (!fechados.has(hid)) {
      itens.push({
        id: `fech-${hid}`, tipo: 'fechamento', estado: 'atencao',
        label: 'Mês da Holding ainda não fechado',
        familia: famNome.get(info.fam) ?? 'Carteira', holding: info.razao,
        href: `/app/mes?fam=${info.fam}`,
        ordem: 'zzy',
      })
    }
  }

  const peso = (e: EstadoFarol) => (e === 'alerta' ? 0 : 1)
  itens.sort((a, b) => peso(a.estado) - peso(b.estado) || a.ordem.localeCompare(b.ordem))
  return itens
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
