// Minutas societárias — SOMENTE documentos do escopo do CONTADOR:
// ata de aprovação de contas e ata de deliberação de distribuição de lucros.
// Doações, cláusulas de proteção, alterações contratuais e pactos são do
// ADVOGADO — o app encaminha, não redige.
// Fonte única do conteúdo: a página impressa e o PDF do ZapSign leem daqui.

export type MinutaTipo = 'aprovacao-contas' | 'distribuicao' | 'reuniao-socios' | 'reuniao-familia'

export type SocioQuota = { nome: string; percentual: number | null; quantidade: number }

export type Minuta = {
  titulo: string
  cabecalho: string[]
  paragrafos: string[]
  deliberacoes: string[]
  assinantes: string[]
  nota: string
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function extensoData(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} de ${MESES[Number(m) - 1]} de ${a}`
}
function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function pctSocio(s: SocioQuota, total: number): string {
  if (s.percentual != null) return `${s.percentual}%`
  if (total > 0) return `${((s.quantidade / total) * 100).toFixed(2)}%`
  return '—'
}

const NOTA_FRONTEIRA =
  'Esta minuta é um documento de registro societário elaborado pelo contador responsável. Não constitui parecer jurídico. A redação e a interpretação de instrumentos como doações, cláusulas de proteção patrimonial, acordos de quotistas e alterações contratuais são atribuição do advogado. Confira os dados antes de colher as assinaturas.'

export function ataAprovacaoContas(
  holding: { razao_social: string; cnpj?: string | null },
  socios: SocioQuota[],
  params: { exercicio: number; dataReuniao: string; sede?: string | null },
): Minuta {
  const total = socios.reduce((s, q) => s + Number(q.quantidade), 0)
  const cabecalho = [
    `${holding.razao_social.toUpperCase()}${holding.cnpj ? ` — CNPJ ${holding.cnpj}` : ''}`,
    `ATA DE REUNIÃO DE SÓCIOS — APROVAÇÃO DE CONTAS DO EXERCÍCIO DE ${params.exercicio}`,
  ]
  const paragrafos = [
    `Aos ${extensoData(params.dataReuniao)}, ${params.sede ? `na sede da sociedade, situada em ${params.sede}, ` : 'na sede da sociedade, '}reuniram-se os sócios da ${holding.razao_social}, representando a totalidade do capital social, dispensadas as formalidades de convocação nos termos da lei e do contrato social.`,
    `Instalada a reunião, os sócios examinaram as contas da administração, o balanço patrimonial e o resultado econômico referentes ao exercício encerrado em 31 de dezembro de ${params.exercicio}.`,
  ]
  const deliberacoes = [
    `Aprovar, sem ressalvas, as contas da administração e as demonstrações financeiras relativas ao exercício de ${params.exercicio}.`,
    'Manter a escrituração e a documentação de suporte arquivadas na sede da sociedade, à disposição dos sócios e das autoridades competentes.',
    'Autorizar a administração a adotar as providências necessárias ao cumprimento das obrigações acessórias decorrentes desta aprovação.',
  ]
  const assinantes = socios.map((s) => `${s.nome} — titular de ${pctSocio(s, total)} das quotas`)
  return {
    titulo: 'Ata de aprovação de contas',
    cabecalho,
    paragrafos,
    deliberacoes,
    assinantes,
    nota: NOTA_FRONTEIRA,
  }
}

export function ataDistribuicao(
  holding: { razao_social: string; cnpj?: string | null },
  socios: SocioQuota[],
  params: { competencia: string; valorTotal: number; dataReuniao: string; proporcional: boolean; sede?: string | null },
): Minuta {
  const total = socios.reduce((s, q) => s + Number(q.quantidade), 0)
  const [a, m] = params.competencia.slice(0, 10).split('-')
  const compLabel = `${MESES[Number(m) - 1]} de ${a}`

  const cabecalho = [
    `${holding.razao_social.toUpperCase()}${holding.cnpj ? ` — CNPJ ${holding.cnpj}` : ''}`,
    `ATA DE REUNIÃO DE SÓCIOS — DELIBERAÇÃO DE DISTRIBUIÇÃO DE LUCROS`,
  ]
  const paragrafos = [
    `Aos ${extensoData(params.dataReuniao)}, ${params.sede ? `na sede da sociedade, situada em ${params.sede}, ` : 'na sede da sociedade, '}reuniram-se os sócios da ${holding.razao_social}, representando a totalidade do capital social, dispensadas as formalidades de convocação nos termos da lei e do contrato social.`,
    `Os sócios deliberaram sobre a distribuição de lucros apurados e disponíveis, referentes à competência de ${compLabel}, no valor total de ${brl(params.valorTotal)}.`,
    params.proporcional
      ? 'A distribuição observará a proporção da participação de cada sócio no capital social, conforme quadro abaixo.'
      : 'A distribuição será realizada de forma desproporcional às quotas, na forma deliberada por unanimidade pelos sócios e admitida pelo contrato social, conforme quadro abaixo.',
  ]
  const deliberacoes = [
    `Aprovar a distribuição de lucros no valor de ${brl(params.valorTotal)}, referente à competência de ${compLabel}.`,
    ...socios.map((s) => {
      const frac = params.proporcional && total > 0 ? (Number(s.quantidade) / total) * params.valorTotal : null
      return `${s.nome} — participação de ${pctSocio(s, total)}${frac != null ? `, correspondente a ${brl(frac)}` : ''}.`
    }),
    'Registrar que a distribuição observa a regularidade da escrituração contábil da sociedade e que a documentação de suporte permanece arquivada na sede.',
  ]
  const assinantes = socios.map((s) => `${s.nome} — titular de ${pctSocio(s, total)} das quotas`)
  return {
    titulo: 'Ata de deliberação de distribuição',
    cabecalho,
    paragrafos,
    deliberacoes,
    assinantes,
    nota: NOTA_FRONTEIRA,
  }
}

export function ataReuniaoSocios(
  holding: { razao_social: string; cnpj?: string | null },
  socios: SocioQuota[],
  params: { dataReuniao: string; assunto: string; sede?: string | null },
): Minuta {
  const total = socios.reduce((s, q) => s + Number(q.quantidade), 0)
  const assunto = (params.assunto || 'deliberações gerais da sociedade').trim()
  const cabecalho = [
    `${holding.razao_social.toUpperCase()}${holding.cnpj ? ` — CNPJ ${holding.cnpj}` : ''}`,
    'ATA DE REUNIÃO DE SÓCIOS',
  ]
  const paragrafos = [
    `Aos ${extensoData(params.dataReuniao)}, ${params.sede ? `na sede da sociedade, situada em ${params.sede}, ` : 'na sede da sociedade, '}reuniram-se os sócios da ${holding.razao_social}, representando a totalidade do capital social, dispensadas as formalidades de convocação nos termos da lei e do contrato social.`,
    `Instalada a reunião, os sócios passaram a deliberar sobre a seguinte pauta: ${assunto}.`,
  ]
  const deliberacoes = [
    `Deliberar sobre ${assunto}, nos termos discutidos e aprovados pelos sócios presentes.`,
    'Autorizar a administração a adotar as providências necessárias à execução do que foi deliberado.',
    'Manter a documentação de suporte arquivada na sede da sociedade, à disposição dos sócios e das autoridades competentes.',
  ]
  const assinantes = socios.map((s) => `${s.nome} — titular de ${pctSocio(s, total)} das quotas`)
  return {
    titulo: 'Ata de reunião de sócios',
    cabecalho,
    paragrafos,
    deliberacoes,
    assinantes,
    nota: NOTA_FRONTEIRA,
  }
}

export function ataReuniaoFamilia(
  holding: { razao_social: string; cnpj?: string | null },
  socios: SocioQuota[],
  params: { dataReuniao: string; assunto: string; sede?: string | null },
): Minuta {
  const total = socios.reduce((s, q) => s + Number(q.quantidade), 0)
  const assunto = (params.assunto || 'governança do patrimônio familiar e diretrizes de sucessão').trim()
  const cabecalho = [
    `${holding.razao_social.toUpperCase()}${holding.cnpj ? ` — CNPJ ${holding.cnpj}` : ''}`,
    'ATA DE REUNIÃO DE FAMÍLIA',
  ]
  const paragrafos = [
    `Aos ${extensoData(params.dataReuniao)}, ${params.sede ? `em ${params.sede}, ` : ''}reuniram-se os membros da família titulares e sucessores do patrimônio organizado por meio da ${holding.razao_social}, em reunião de governança familiar, para alinhamento e registro das decisões a seguir.`,
    `A reunião teve como pauta: ${assunto}.`,
    'Esta ata registra o consenso familiar sobre as diretrizes discutidas. A formalização de instrumentos jurídicos decorrentes (contratos, cláusulas, doações e pactos) será conduzida pelo advogado da família.',
  ]
  const deliberacoes = [
    `Alinhar as diretrizes de ${assunto}, conforme consenso dos presentes.`,
    'Definir o cronograma das próximas providências e os responsáveis por cada uma.',
    'Encaminhar ao advogado da família a redação dos instrumentos jurídicos necessários e ao contador o registro e a organização dos atos.',
    'Manter esta ata e os documentos de suporte arquivados, à disposição da família.',
  ]
  const assinantes = socios.map((s) => `${s.nome} — titular de ${pctSocio(s, total)} das quotas`)
  return {
    titulo: 'Ata de reunião de família',
    cabecalho,
    paragrafos,
    deliberacoes,
    assinantes,
    nota: NOTA_FRONTEIRA,
  }
}

export const MINUTAS_INFO: { tipo: MinutaTipo; titulo: string; descricao: string }[] = [
  {
    tipo: 'aprovacao-contas',
    titulo: 'Ata de aprovação de contas',
    descricao: 'A ata anual que comprova a regularidade da sociedade — base para a distribuição de lucros e para a separação patrimonial.',
  },
  {
    tipo: 'distribuicao',
    titulo: 'Ata de deliberação de distribuição',
    descricao: 'Formaliza a deliberação da distribuição de lucros — a defesa fiscal que transforma o pagamento informal em ato societário registrado.',
  },
  {
    tipo: 'reuniao-socios',
    titulo: 'Ata de reunião de sócios (deliberações gerais)',
    descricao: 'Modelo aberto para registrar decisões da sociedade — aprovação do calendário anual, ratificação de atos, deliberações de governança. Você ajusta a pauta e envia para assinatura.',
  },
  {
    tipo: 'reuniao-familia',
    titulo: 'Ata de reunião de família (governança)',
    descricao: 'Registra o consenso da família sobre as diretrizes do patrimônio e da sucessão — o documento de governança do family office. Instrumentos jurídicos decorrentes ficam com o advogado; a ata organiza e prova a decisão.',
  },
]
