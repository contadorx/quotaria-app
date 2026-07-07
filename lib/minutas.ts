// Minutas societárias — SOMENTE documentos do escopo do CONTADOR:
// ata de aprovação de contas e ata de deliberação de distribuição de lucros.
// Doações, cláusulas de proteção, alterações contratuais e pactos são do
// ADVOGADO — o app encaminha, não redige.
// Fonte única do conteúdo: a página impressa e o PDF do ZapSign leem daqui.

export type MinutaTipo = 'aprovacao-contas' | 'distribuicao'

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
]
