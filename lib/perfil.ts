// Perfil do escritório — a moldura que muda entre contador e advogado.
// O núcleo do sistema é o mesmo; muda a copy, a fronteira e alguns rótulos.

export type Perfil = 'contabil' | 'juridico'

export function perfilValido(v: string | null | undefined): Perfil {
  return v === 'juridico' ? 'juridico' : 'contabil'
}

type Molde = {
  profissional: string // "contador" | "advogado"
  registro: string // "CRC" | "OAB"
  registroPlaceholder: string
  // fronteira das minutas
  fronteiraTitulo: string
  fronteiraTexto: string
  fronteiraInvertida: boolean // true = o próprio usuário redige (advogado)
  // nota de rodapé das peças
  notaPeca: string
  // o Radar comercial (garimpo/prospecção) é sensível para OAB
  radarComercialSensivel: boolean
  // o PARCEIRO complementar que este escritório convida
  parceiro: string // "advogado" | "contador"
  parceiroRegistro: string // "OAB" | "CRC"
  parceiroContribui: string // o que o parceiro registra em contribuição
}

const CONTABIL: Molde = {
  profissional: 'contador',
  registro: 'CRC',
  registroPlaceholder: 'CRC-SP 000000',
  fronteiraTitulo: 'Doações, cláusulas e alterações contratuais são do advogado',
  fronteiraTexto:
    'O Quotaria gera as atas de registro societário (aprovação de contas e deliberação de distribuição). Instrumentos de doação, cláusulas de proteção, acordos de quotistas e alterações do contrato social são redigidos e interpretados pelo advogado parceiro — o app organiza e encaminha, não redige.',
  fronteiraInvertida: false,
  notaPeca:
    'Esta minuta é um documento de registro societário elaborado pelo contador responsável. Não constitui parecer jurídico. A redação e a interpretação de instrumentos como doações, cláusulas de proteção patrimonial, acordos de quotistas e alterações contratuais são atribuição do advogado. Confira os dados antes de colher as assinaturas.',
  radarComercialSensivel: false,
  parceiro: 'advogado',
  parceiroRegistro: 'OAB',
  parceiroContribui: 'cláusulas de proteção',
}

const JURIDICO: Molde = {
  profissional: 'advogado',
  registro: 'OAB',
  registroPlaceholder: 'OAB/SP 000000',
  fronteiraTitulo: 'As peças jurídicas são suas — a escrituração é do contador',
  fronteiraTexto:
    'O Quotaria organiza a estrutura e gera as atas societárias a partir dos dados. A redação e a interpretação das doações, cláusulas e alterações contratuais são seu trabalho, advogado. A escrituração contábil que dá suporte às distribuições e à regularidade fiscal fica com o contador da família.',
  fronteiraInvertida: true,
  notaPeca:
    'Documento societário gerado a partir dos dados da estrutura. A escrituração contábil de suporte é de responsabilidade do contador da família. Confira os dados antes de colher as assinaturas.',
  radarComercialSensivel: true,
  parceiro: 'contador',
  parceiroRegistro: 'CRC',
  parceiroContribui: 'distribuições',
}

export function molde(perfil: Perfil): Molde {
  return perfil === 'juridico' ? JURIDICO : CONTABIL
}

// Papel do PARCEIRO convidado, dado o perfil do escritório que possui a família.
// Escritório contábil convida advogado; escritório jurídico convida contador.
export function parceiroRole(orgPerfil: string | null | undefined): 'advogado' | 'contador' {
  return orgPerfil === 'juridico' ? 'contador' : 'advogado'
}
