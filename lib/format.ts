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

export const LABEL_TIPO_EVENTO: Record<string, string> = {
  ata_anual: 'Ata anual',
  revisao: 'Revisão',
  distribuicao: 'Distribuição',
  doacao: 'Doação',
  marco_reforma: 'Marco da Reforma',
  outro: 'Outro',
}

// data ISO (YYYY-MM-DD) sem fuso — evita o "menos um dia" do new Date()
export function formatarDataISO(iso: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export const LABEL_TIPO_DISTRIBUICAO: Record<string, string> = {
  lucros: 'Lucros/dividendos',
  jcp: 'JCP',
  outro: 'Outro',
}

export const LABEL_STATUS_DOACAO: Record<string, string> = {
  planejada: 'Planejada',
  em_cartorio: 'Em cartório',
  concluida: 'Concluída',
}

export const LABEL_TIPO_DOCUMENTO: Record<string, string> = {
  ata: 'Ata',
  contrato_social: 'Contrato social',
  acordo_quotistas: 'Acordo de quotistas',
  doacao: 'Doação',
  laudo: 'Laudo',
  matricula: 'Matrícula',
  outro: 'Outro',
}

export function formatarTamanho(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const LABEL_MOTIVO_EXTINCAO: Record<string, string> = {
  falecimento: 'Falecimento do usufrutuário',
  renuncia: 'Renúncia ao usufruto',
  outro: 'Outro (termo/decisão)',
}

export const CLAUSULAS_DOACAO: { campo: string; label: string; sigla: string }[] = [
  { campo: 'clausula_incomunicabilidade', label: 'Incomunicabilidade', sigla: 'INC' },
  { campo: 'clausula_impenhorabilidade', label: 'Impenhorabilidade', sigla: 'IMP' },
  { campo: 'clausula_inalienabilidade', label: 'Inalienabilidade', sigla: 'INA' },
  { campo: 'clausula_reversao', label: 'Reversão', sigla: 'REV' },
]

export const EXECUCAO_DOACAO: { campo: string; label: string }[] = [
  { campo: 'minuta_solicitada', label: 'Minuta solicitada ao advogado' },
  { campo: 'guia_itcmd_paga', label: 'Guia de ITCMD paga' },
  { campo: 'escritura_lavrada', label: 'Escritura lavrada' },
  { campo: 'registro_concluido', label: 'Registro concluído' },
]
