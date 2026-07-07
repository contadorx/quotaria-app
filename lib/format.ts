export function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export const LABEL_TIPO_SOCIETARIO: Record<string, string> = {
  ltda: 'Ltda',
  sa: 'S/A',
}

export const LABEL_STATUS_HOLDING: Record<string, string> = {
  ativa: 'Ativa',
  em_constituicao: 'Em constituição',
  inativa: 'Inativa',
}

export const LABEL_PAPEL_FAMILIAR: Record<string, string> = {
  patriarca: 'Patriarca',
  matriarca: 'Matriarca',
  conjuge: 'Cônjuge',
  filho: 'Filho(a)',
  neto: 'Neto(a)',
  outro: 'Outro',
}

export const LABEL_ESTADO_CIVIL: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  uniao_estavel: 'União estável',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
}

export const LABEL_REGIME_BENS: Record<string, string> = {
  comunhao_parcial: 'Comunhão parcial',
  comunhao_universal: 'Comunhão universal',
  separacao_total: 'Separação total',
  participacao_final: 'Participação final nos aquestos',
  nao_aplicavel: 'Não se aplica',
}

export const LABEL_TIPO_DIREITO: Record<string, string> = {
  plena: 'Plena',
  nua_propriedade: 'Nua-propriedade',
  usufruto: 'Usufruto',
}

export const LABEL_CLASSE_QUOTA: Record<string, string> = {
  ordinaria: 'Ordinária',
  preferencial: 'Preferencial',
}

export const LABEL_TIPO_BEM: Record<string, string> = {
  imovel: 'Imóvel',
  participacao: 'Participação',
  veiculo: 'Veículo',
  aplicacao: 'Aplicação',
  outro: 'Outro',
}

export const LABEL_TIPO_CLAUSULA: Record<string, string> = {
  incomunicabilidade: 'Incomunicabilidade',
  impenhorabilidade: 'Impenhorabilidade',
  inalienabilidade: 'Inalienabilidade',
  reversao: 'Reversão',
  usufruto_vitalicio: 'Usufruto vitalício',
  outra: 'Outra',
}

export function formatarMoeda(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
