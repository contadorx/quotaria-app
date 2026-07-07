// Radar de Oportunidades — motores de qualificação e argumentário.
// TUDO aqui é ESTIMATIVA DE CENÁRIO para conversa comercial (disclaimers na UI):
// ITCMD varia por estado; o cálculo definitivo é do contador; instrumentos, do advogado.

export type Sinais = {
  n_imoveis: number
  patrimonio: number
  renda_aluguel_anual: number
  socio_pj: boolean
  recebe_dividendos: boolean
  n_herdeiros: number
}

// ---------------- MOTOR 1 · QUALIFICAR (score 0-100 + gatilho da Reforma) ---------------
// Pesos transparentes (máx 100): patrimônio 30 · aluguel 25 · imóveis 15 ·
// sócio PJ 10 · dividendos 8 · herdeiros 12.
export function calcularScore(s: Sinais): number {
  let pts = 0
  if (s.patrimonio >= 4_000_000) pts += 30
  else if (s.patrimonio >= 2_000_000) pts += 25
  else if (s.patrimonio >= 1_000_000) pts += 18
  else if (s.patrimonio >= 500_000) pts += 10
  else if (s.patrimonio > 0) pts += 4

  if (s.renda_aluguel_anual >= 240_000) pts += 25
  else if (s.renda_aluguel_anual >= 120_000) pts += 18
  else if (s.renda_aluguel_anual >= 60_000) pts += 12
  else if (s.renda_aluguel_anual > 0) pts += 6

  if (s.n_imoveis >= 4) pts += 15
  else if (s.n_imoveis === 3) pts += 12
  else if (s.n_imoveis === 2) pts += 8
  else if (s.n_imoveis === 1) pts += 4

  if (s.socio_pj) pts += 10
  if (s.recebe_dividendos) pts += 8

  if (s.n_herdeiros >= 3) pts += 12
  else if (s.n_herdeiros === 2) pts += 9
  else if (s.n_herdeiros === 1) pts += 6

  return Math.min(100, pts)
}

export function classificar(score: number): 'ALTA' | 'MÉDIA' | 'BAIXA' {
  if (score >= 70) return 'ALTA'
  if (score >= 40) return 'MÉDIA'
  return 'BAIXA'
}

// Gatilho da Reforma: PF vira contribuinte do IVA com locação > R$ 240k/ano E > 3 imóveis.
export function leadQuenteReforma(s: Sinais): boolean {
  return s.renda_aluguel_anual > 240_000 && s.n_imoveis > 3
}

// ---------------- MOTOR 2 · ARGUMENTAR (comparativo PF × holding + custo de não planejar) ---------------
// IRPF anual sobre aluguéis (carnê-leão) — tabela progressiva 2025 anualizada,
// SEM o redutor da Lei 15.270 (cenário conservador; para o perfil-alvo, a marginal
// de 27,5% domina).
export function irpfAnualAluguel(rendaAnual: number): number {
  if (rendaAnual <= 0) return 0
  const faixas = [
    { ate: 29_145.6, aliq: 0, deduz: 0 },
    { ate: 33_919.8, aliq: 0.075, deduz: 2_185.92 },
    { ate: 45_012.6, aliq: 0.15, deduz: 4_729.9 },
    { ate: 55_976.16, aliq: 0.225, deduz: 8_105.85 },
    { ate: Infinity, aliq: 0.275, deduz: 10_904.66 },
  ]
  const f = faixas.find((x) => rendaAnual <= x.ate)!
  return Math.max(0, rendaAnual * f.aliq - f.deduz)
}

// Holding no lucro presumido (locação): IRPJ 15%×32% + adicional 10% sobre a base
// que excede R$ 240k/ano + CSLL 9%×32% + PIS 0,65% + COFINS 3%.
export function tributoHoldingAluguel(rendaAnual: number): number {
  if (rendaAnual <= 0) return 0
  const base = rendaAnual * 0.32
  const irpj = base * 0.15 + Math.max(0, base - 240_000) * 0.10
  const csll = base * 0.09
  const pisCofins = rendaAnual * 0.0365
  return irpj + csll + pisCofins
}

export function economiaAnualAluguel(rendaAnual: number): number {
  return Math.max(0, irpfAnualAluguel(rendaAnual) - tributoHoldingAluguel(rendaAnual))
}

export function custoNaoPlanejar(patrimonio: number, itcmdPct: number, inventarioPct: number): number {
  return (patrimonio * (itcmdPct + inventarioPct)) / 100
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function frasePronta(
  nome: string,
  s: Sinais,
  itcmdPct: number,
  inventarioPct: number,
): string {
  const econ = economiaAnualAluguel(s.renda_aluguel_anual)
  const custo = custoNaoPlanejar(s.patrimonio, itcmdPct, inventarioPct)
  const partes: string[] = []
  partes.push(
    `${nome}, com ${brl(s.patrimonio)} em patrimônio` +
      (s.renda_aluguel_anual > 0 ? ` e ${brl(s.renda_aluguel_anual)}/ano de aluguéis na pessoa física` : '') +
      ',',
  )
  if (econ > 0) partes.push(`a estimativa é de ~${brl(econ)}/ano deixados na mesa`)
  partes.push(
    `${econ > 0 ? 'e ' : 'a estimativa é de '}~${brl(custo)} de ITCMD e custos de inventário no cenário sem planejamento` +
      (s.n_herdeiros > 0 ? ` — com ${s.n_herdeiros} herdeiro(s) na sucessão` : '') +
      '.',
  )
  partes.push('A Reforma muda a tributação da locação a partir de 2027 — vale conversarmos antes.')
  return partes.join(' ')
}

export const LABEL_STATUS_RADAR: Record<string, string> = {
  novo: 'Novo',
  abordado: 'Abordado',
  diagnostico: 'Diagnóstico',
  proposta: 'Proposta',
  fechado: 'Fechado',
  descartado: 'Descartado',
}

// Potencial de honorário mensal por classificação (a "conta da isca"):
export function potencialMensal(classe: 'ALTA' | 'MÉDIA' | 'BAIXA'): number {
  if (classe === 'ALTA') return 1500
  if (classe === 'MÉDIA') return 800
  return 0
}
