// Diagnóstico Patrimonial — motor do RELATÓRIO que o contador conduz com a família.
// Reaproveita os cálculos de lib/radar.ts e monta, a partir dos dados do cliente:
//   1) o comparativo sucessório (Caminho A = inventário × Caminho B = planejar em vida)
//   2) o comparativo da locação sob a Reforma (PF × holding)
//   3) os "pontos de atenção" (só os que se aplicam ao caso)
//   4) o semáforo e as recomendações
// TUDO é ESTIMATIVA DE CENÁRIO (disclaimer na UI): ITCMD varia por estado; o
// cálculo definitivo é do contador; instrumentos jurídicos, do advogado.

import {
  economiaAnualAluguel, irpfAnualAluguel, tributoHoldingAluguel,
  leadQuenteReforma, type Sinais,
} from '@/lib/radar'

export type ClienteDiagnostico = Sinais & {
  nome: string
  uf: string
  itcmd_pct: number
  inventario_pct: number
  holding_existe: boolean
  holding_ano: number | null
  ata_em_dia: boolean
  doacao_iniciada: boolean
}

export type Achado = {
  titulo: string
  texto: string
  nivel: 'alerta' | 'atencao' | 'ok'
}

export type Recomendacao = { titulo: string; texto: string }

// ---- cenário sucessório (A × B) --------------------------------------------
export function cenarioSucessorio(c: ClienteDiagnostico) {
  const base = Number(c.patrimonio)
  const itcmd = (base * Number(c.itcmd_pct)) / 100
  const custas = (base * Number(c.inventario_pct)) / 100
  const totalA = itcmd + custas
  // Caminho B: doação em vida pela base atual. Estimativa conservadora do ITCMD
  // sobre a mesma base (mesma alíquota), SEM as custas/honorários de inventário.
  // A economia vem de (1) eliminar custas de inventário e (2) capturar a base
  // atual antes da migração para valor de mercado (PLP 108).
  const itcmdDoacaoB = itcmd // mesma alíquota, base atual
  const totalB = itcmdDoacaoB
  const economia = Math.max(0, totalA - totalB)
  return { base, itcmd, custas, totalA, itcmdDoacaoB, totalB, economia }
}

// ---- cenário locação (PF × holding) ----------------------------------------
export function cenarioLocacao(c: ClienteDiagnostico) {
  const renda = Number(c.renda_aluguel_anual)
  const pf = irpfAnualAluguel(renda)
  const holding = tributoHoldingAluguel(renda)
  const economia = economiaAnualAluguel(renda)
  const quente = leadQuenteReforma(c)
  return { renda, pf, holding, economia, quente }
}

// ---- pontos de atenção (só os que se aplicam) ------------------------------
export function achados(c: ClienteDiagnostico): Achado[] {
  const out: Achado[] = []
  const preReforma = c.holding_existe && c.holding_ano !== null && Number(c.holding_ano) < 2026

  // 1) holding abandonada / documentação
  if (c.holding_existe && !c.ata_em_dia) {
    out.push({
      nivel: 'alerta',
      titulo: 'Manutenção societária em aberto',
      texto:
        'A holding existe, mas as atas de aprovação de contas não estão em dia. A ata anual é o que comprova a regularidade da sociedade — base para a distribuição de lucros e para afastar a confusão patrimonial. Recompor é trabalho de organização, não de reconstituição.',
    })
  } else if (c.holding_existe && c.ata_em_dia) {
    out.push({
      nivel: 'ok',
      titulo: 'Formalidade societária em dia',
      texto: 'As atas estão em dia — base sólida para manter a proteção e a distribuição regular de lucros.',
    })
  }

  // 2) sucessão não iniciada / janela ITCMD
  if (c.n_herdeiros > 0 && !c.doacao_iniciada) {
    out.push({
      nivel: 'alerta',
      titulo: 'Sucessão não iniciada — a janela do ITCMD',
      texto:
        `Nenhuma quota transmitida em vida, com ${c.n_herdeiros} herdeiro(s) na sucessão. ` +
        'Enquanto a base de cálculo do ITCMD sobre quotas ainda é o valor patrimonial na unidade da federação, doar em vida custa uma fração do inventário. Essa base tende a migrar para valor de mercado — a doação “barata” tem prazo de validade, sem data exata.',
    })
  } else if (c.n_herdeiros > 0 && c.doacao_iniciada) {
    out.push({
      nivel: 'atencao',
      titulo: 'Cronograma de doações em andamento',
      texto:
        'A transmissão em vida já começou — vale revisar o ritmo com o advogado para antecipar o que for prudente enquanto a base atual prevalece, com laudo no dossiê.',
    })
  }

  // 3) exposição da locação à Reforma
  const loc = cenarioLocacao(c)
  if (loc.quente) {
    out.push({
      nivel: 'alerta',
      titulo: 'Lead quente da Reforma — locação exposta',
      texto:
        'Locação acima de ~R$ 240 mil/ano com mais de três imóveis: na pessoa física, o titular passa a ser contribuinte de IBS/CBS. Bem enquadrada na holding, a carga cai muito — mas o reenquadramento tem calendário (2026–2033) e cada marco é uma revisão a ser feita.',
    })
  } else if (loc.renda > 0) {
    out.push({
      nivel: 'atencao',
      titulo: 'Locação sob a Reforma',
      texto:
        'Há receita de locação relevante. A Reforma redesenhou a comparação entre manter os imóveis na pessoa física e na holding — vale confirmar o enquadramento (regime de caixa, redutor social, cláusulas de repasse).',
    })
  }

  // 4) gatilho "mundo pré-reforma"
  if (preReforma) {
    out.push({
      nivel: 'atencao',
      titulo: 'Estrutura montada no mundo pré-reforma',
      texto:
        `A holding foi constituída em ${c.holding_ano}, antes do marco da Reforma. As regras de locação, sucessão e distribuição mudaram — o que protegia antes precisa ser revisto, com data.`,
    })
  }

  // 5) distribuição / dividendos
  if (c.recebe_dividendos) {
    out.push({
      nivel: 'atencao',
      titulo: 'Distribuição de lucros sob a nova regra',
      texto:
        'Há distribuição de lucros. Com a Lei 15.270/2025 tributando distribuições acima de R$ 50 mil/mês por pessoa física, o desenho e o registro da distribuição (com deliberação) deixaram de ser detalhe — viraram disciplina.',
    })
  }

  return out
}

export function semaforo(lista: Achado[]): { cor: 'verde' | 'amarelo' | 'vermelho'; texto: string } {
  const alertas = lista.filter((a) => a.nivel === 'alerta').length
  if (alertas >= 2) return { cor: 'vermelho', texto: 'Crítico — múltiplos pontos exigem ação com prazo.' }
  if (alertas === 1) return { cor: 'amarelo', texto: 'Atenção — há ponto relevante a organizar com prioridade.' }
  const atencoes = lista.filter((a) => a.nivel === 'atencao').length
  if (atencoes > 0) return { cor: 'amarelo', texto: 'Atenção — ajustes recomendados na estrutura.' }
  return { cor: 'verde', texto: 'Em dia — manter a rotina de manutenção anual.' }
}

export function recomendacoes(c: ClienteDiagnostico): Recomendacao[] {
  const out: Recomendacao[] = []
  if (!c.holding_existe) {
    out.push({
      titulo: 'Avaliar a constituição da holding',
      texto:
        'Estruturar a holding com o advogado — você organiza e registra; a redação dos instrumentos (contrato social, cláusulas) é dele.',
    })
  } else if (!c.ata_em_dia) {
    out.push({
      titulo: 'Regularizar a formalidade societária',
      texto: 'Recompor as atas em aberto e formalizar a deliberação das distribuições. Organização e registro com o contador.',
    })
  }
  if (c.n_herdeiros > 0 && !c.doacao_iniciada) {
    out.push({
      titulo: 'Iniciar o cronograma de doações',
      texto:
        'Desenhar com o advogado o ritmo de transmissão das quotas, com usufruto e laudo, aproveitando a base atual antes da migração para valor de mercado.',
    })
  }
  if (Number(c.renda_aluguel_anual) > 0) {
    out.push({
      titulo: 'Revisar o enquadramento da locação',
      texto: 'Confirmar regime de caixa, redutor social e cláusulas de repasse nos contratos, alinhados ao calendário 2026–2033.',
    })
  }
  out.push({
    titulo: 'Instituir a manutenção anual',
    texto:
      'Calendário de obrigações, dossiê documental, distribuições deliberadas e um relatório anual que mostra à família, todo ano, o que foi feito e o que a estrutura preservou.',
  })
  return out
}
