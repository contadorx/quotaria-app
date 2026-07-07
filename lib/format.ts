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
