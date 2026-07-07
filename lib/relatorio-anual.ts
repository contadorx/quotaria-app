// Relatório Anual white-label — motor que consolida o ANO de uma holding.
// "Sai num botão": junta os 12 fechamentos (Mês da Holding), as distribuições
// deliberadas, as doações concluídas, o dossiê documental e a sucessão em
// andamento, e monta a economia realizada + o radar do próximo ano.
// TUDO é registro do que foi feito + estimativa de cenário (disclaimer na UI):
// ITCMD varia por estado; o cálculo definitivo é do contador; instrumentos, do advogado.

// Custo de inventário evitado — estimativa CONSERVADORA (ITCMD + custas/honorários),
// varia por estado e caso. Usado só para dimensionar a economia realizada.
export const CUSTO_INVENTARIO_PADRAO = 10 // %

export type Fechamento = {
  competencia: string
  distribuicoes_ok: boolean
  documentos_ok: boolean
  alertas_ok: boolean
  alugueis_ok: boolean
  doacoes_ok: boolean
}
export type Distribuicao = {
  competencia: string
  valor_total: number
  tipo: string
  deliberacao: string | null
  data_deliberacao: string | null
}
export type Doacao = {
  quantidade_quotas: number
  valor_estimado: number | null
  itcmd_estimado: number | null
  status: string
  data_conclusao: string | null
}
export type Conformidade = {
  nfse_cbs: boolean
  clausula_repasse: boolean
  credito_locatario: boolean
  redutor_social: boolean
  regime_caixa: boolean
} | null

const CRITERIOS_FECHAMENTO = 5 // distribuicoes, documentos, alertas, alugueis, doacoes

// ---- saúde do ano (semáforo) -----------------------------------------------
export function saudeAno(fechamentos: Fechamento[]): {
  cor: 'verde' | 'amarelo' | 'vermelho'
  texto: string
  mesesFechados: number
  pctCriterios: number
} {
  const mesesFechados = fechamentos.length
  if (mesesFechados === 0) {
    return { cor: 'vermelho', texto: 'Sem fechamentos no período — manutenção não iniciada.', mesesFechados: 0, pctCriterios: 0 }
  }
  let ok = 0
  for (const f of fechamentos) {
    ok += [f.distribuicoes_ok, f.documentos_ok, f.alertas_ok, f.alugueis_ok, f.doacoes_ok].filter(Boolean).length
  }
  const pct = Math.round((ok / (mesesFechados * CRITERIOS_FECHAMENTO)) * 100)
  if (mesesFechados >= 10 && pct >= 85) return { cor: 'verde', texto: 'Em dia — manutenção consistente ao longo do ano.', mesesFechados, pctCriterios: pct }
  if (mesesFechados >= 6 && pct >= 60) return { cor: 'amarelo', texto: 'Atenção — manutenção com lacunas a recuperar.', mesesFechados, pctCriterios: pct }
  return { cor: 'vermelho', texto: 'Crítico — manutenção irregular no período.', mesesFechados, pctCriterios: pct }
}

// ---- distribuições: deliberadas × sem deliberação --------------------------
export function resumoDistribuicoes(lista: Distribuicao[]) {
  const total = lista.reduce((s, d) => s + Number(d.valor_total), 0)
  const comDeliberacao = lista.filter((d) => (d.deliberacao && d.deliberacao.trim()) || d.data_deliberacao)
  const semDeliberacao = lista.length - comDeliberacao.length
  return { qtd: lista.length, total, comDeliberacao: comDeliberacao.length, semDeliberacao }
}

// ---- doações: concluídas no ano + ITCMD ------------------------------------
export function resumoDoacoes(lista: Doacao[]) {
  const concluidas = lista.filter((d) => d.status === 'concluida')
  const quotasDoadas = concluidas.reduce((s, d) => s + Number(d.quantidade_quotas), 0)
  const valorTransmitido = concluidas.reduce((s, d) => s + Number(d.valor_estimado ?? 0), 0)
  const itcmdPago = concluidas.reduce((s, d) => s + Number(d.itcmd_estimado ?? 0), 0)
  const emAndamento = lista.filter((d) => d.status !== 'concluida').length
  return { concluidas: concluidas.length, emAndamento, quotasDoadas, valorTransmitido, itcmdPago }
}

// ---- sucessão em andamento (% do capital transmitido em vida) --------------
export function sucessaoAndamento(quotasDoadasConcluidas: number, totalQuotasHolding: number) {
  if (totalQuotasHolding <= 0) return { pct: 0, transmitidas: quotasDoadasConcluidas, total: totalQuotasHolding }
  const pct = Math.min(100, Math.round((quotasDoadasConcluidas / totalQuotasHolding) * 100))
  return { pct, transmitidas: quotasDoadasConcluidas, total: totalQuotasHolding }
}

// ---- economia realizada (ITCMD em vida × cenário inventário) ---------------
export function economiaRealizada(valorTransmitido: number, itcmdPago: number, custoInventarioPct = CUSTO_INVENTARIO_PADRAO) {
  const custoInventario = (valorTransmitido * custoInventarioPct) / 100
  const economia = Math.max(0, custoInventario - itcmdPago)
  return { custoInventario, itcmdPago, economia, custoInventarioPct }
}

// ---- conformidade documental (% dossiê + % Reforma) ------------------------
export function conformidadeDossie(docsNoAno: number, mesesEsperados = 12) {
  const pct = Math.min(100, Math.round((docsNoAno / mesesEsperados) * 100))
  return { docsNoAno, pct }
}
export function conformidadeReforma(c: Conformidade): { pct: number; itens: { label: string; ok: boolean }[] } {
  const itens = [
    { label: 'NFS-e com CBS', ok: !!c?.nfse_cbs },
    { label: 'Cláusula de repasse nos contratos', ok: !!c?.clausula_repasse },
    { label: 'Crédito do locatário PJ', ok: !!c?.credito_locatario },
    { label: 'Redutor social aplicado', ok: !!c?.redutor_social },
    { label: 'Regime de caixa', ok: !!c?.regime_caixa },
  ]
  const pct = Math.round((itens.filter((i) => i.ok).length / itens.length) * 100)
  return { pct, itens }
}

// ---- radar do próximo ano (marcos da Reforma) ------------------------------
export type Marco = { data: string; titulo: string; detalhe: string }
const TIMELINE_REFORMA: Marco[] = [
  { data: '2026-08-01', titulo: 'NFS-e com CBS', detalhe: 'Emissão de NFS-e passa a destacar a CBS.' },
  { data: '2027-01-01', titulo: 'CBS efetiva · fim de PIS/COFINS', detalhe: 'CBS cheia com redutor de 70% na locação; extinção de PIS/COFINS.' },
  { data: '2027-01-01', titulo: 'Janela 2027–2028', detalhe: 'Locação a ~1,8% a 1,9% efetivos — o melhor momento para consolidar o desenho.' },
  { data: '2029-01-01', titulo: 'Transição do IBS (início)', detalhe: 'IBS começa a subir gradualmente até 2033.' },
  { data: '2033-01-01', titulo: 'Regime pleno', detalhe: 'IBS/CBS plenos; locação na holding a ~8,4% efetivos (redutor de 70%).' },
]
export function radarProximoAno(anoReferencia: number, limite = 3): Marco[] {
  const corte = `${anoReferencia}-01-01`
  return TIMELINE_REFORMA.filter((m) => m.data >= corte).slice(0, limite)
}

// ---- recomendações do contador (a partir das lacunas) ----------------------
export function recomendacoesAno(dados: {
  mesesFechados: number
  distSemDeliberacao: number
  dossiePct: number
  reformaPct: number
  temLocacao: boolean
  sucessaoPct: number
  temHerdeiros: boolean
}): string[] {
  const out: string[] = []
  if (dados.mesesFechados < 12) out.push(`Completar os fechamentos mensais faltantes (${12 - dados.mesesFechados} mês(es) em aberto) para manter o histórico auditável.`)
  if (dados.distSemDeliberacao > 0) out.push(`Formalizar a deliberação das ${dados.distSemDeliberacao} distribuição(ões) sem ata vinculada — defesa fiscal embutida.`)
  if (dados.dossiePct < 80) out.push('Completar o dossiê documental do ano — a prova auditável no dia em que o Fisco questiona ou o herdeiro pergunta.')
  if (dados.temLocacao && dados.reformaPct < 100) out.push('Fechar os itens de conformidade da locação sob a Reforma (regime de caixa, redutor social, cláusula de repasse) antes do próximo marco.')
  if (dados.temHerdeiros && dados.sucessaoPct < 100) out.push('Dar sequência ao cronograma de doações com o advogado, aproveitando a base atual do ITCMD.')
  out.push('Manter a rotina do Mês da Holding — 15 minutos por mês que sustentam a proteção e alimentam este relatório automaticamente.')
  return out
}
