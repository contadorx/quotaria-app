// Planos do Quotaria — preço FIXO por plano (sem cobrar por holding).
// Valores oficiais (doc mestre, "sujeito a veto"): editáveis aqui.
import type { Ciclo } from '@/lib/asaas'

export type PlanoId = 'essencial' | 'profissional' | 'family_office'

export type Plano = {
  id: PlanoId
  nome: string
  valor: number // mensal cheio
  descricao: string
  destaques: string[]
  destaque?: boolean
}

export const PLANOS: Plano[] = [
  {
    id: 'essencial',
    nome: 'Essencial',
    valor: 197,
    descricao: 'Para começar a organizar as primeiras famílias.',
    destaques: ['Painel multi-holding', 'Calendário 2026–2033 com alertas', 'Cofre documental', 'Mês da Holding'],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    valor: 297,
    descricao: 'A operação completa de gestão patrimonial recorrente.',
    destaques: ['Tudo do Essencial', 'Cronograma de doações', 'Relatório anual white-label', 'Radar do cliente + diagnóstico', 'Minutas societárias'],
    destaque: true,
  },
  {
    id: 'family_office',
    nome: 'Family Office',
    valor: 497,
    descricao: 'Para quem opera como o family office dos clientes.',
    destaques: ['Tudo do Profissional', 'Governança familiar', 'Prioridade no suporte', 'Volume ampliado de famílias'],
  },
]

// ciclos oferecidos (v1: mensal + anual com 2 meses grátis)
export const CICLOS: { id: Ciclo; nome: string; meses: number; nota?: string }[] = [
  { id: 'mensal', nome: 'Mensal', meses: 1 },
  { id: 'anual', nome: 'Anual', meses: 12, nota: '2 meses grátis' },
]

export function planoPorId(id: string): Plano | undefined {
  return PLANOS.find((p) => p.id === id)
}

// preço cobrado A CADA ciclo no Asaas + o mensal-equivalente (para o MRR).
export function precoCiclo(valorMensal: number, ciclo: Ciclo): { valorCiclo: number; valorMensalEquivalente: number } {
  if (ciclo === 'anual') {
    const valorCiclo = Number((valorMensal * 10).toFixed(2)) // paga 10, leva 12
    return { valorCiclo, valorMensalEquivalente: Number((valorCiclo / 12).toFixed(2)) }
  }
  if (ciclo === 'semestral') {
    const valorCiclo = Number((valorMensal * 5.5).toFixed(2))
    return { valorCiclo, valorMensalEquivalente: Number((valorCiclo / 6).toFixed(2)) }
  }
  return { valorCiclo: Number(valorMensal.toFixed(2)), valorMensalEquivalente: Number(valorMensal.toFixed(2)) }
}

export const LABEL_STATUS_ASSINATURA: Record<string, string> = {
  trial: 'Período de teste',
  bonus: 'Bônus fundador',
  pendente: 'Aguardando pagamento',
  ativa: 'Ativa',
  inadimplente: 'Pagamento em atraso',
  cancelada: 'Cancelada',
}
