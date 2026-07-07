// Avaliação de acesso (paywall) — decide, a partir do estado da assinatura, se o
// escritório tem acesso liberado, um aviso brando, ou o acesso pausado.
// Honesto por desenho: só PAUSA nos estados terminais; avisa (sem travar) nas bordas.

// Dias de carência do inadimplente antes de pausar (a régua de cobrança avisa nesse meio).
export const CARENCIA_INADIMPLENTE_DIAS = 7
// Aviso quando o trial está a estes dias (ou menos) de expirar.
const AVISO_TRIAL_DIAS = 3

export type AcessoOrg = {
  assinatura_status: string
  is_teste: boolean
  trial_ate: string | null
  bonus_ate: string | null
  proximo_vencimento: string | null
}

export type Acesso = {
  estado: 'ok' | 'aviso' | 'bloqueado'
  titulo?: string
  mensagem?: string
  cta?: 'assinar' | 'fatura'
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function diasAte(iso: string): number {
  const alvo = new Date(iso.slice(0, 10) + 'T00:00:00Z').getTime()
  const hoje = new Date(hojeISO() + 'T00:00:00Z').getTime()
  return Math.round((alvo - hoje) / 86400000)
}
function dataBr(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('/')
}

export function avaliarAcesso(org: AcessoOrg): Acesso {
  // contas de teste (do próprio dono) nunca são bloqueadas
  if (org.is_teste) return { estado: 'ok' }

  const s = org.assinatura_status

  if (s === 'ativa') return { estado: 'ok' }

  if (s === 'bonus') {
    // bônus fundador: sem data = vitalício; com data = vale até lá
    if (!org.bonus_ate || diasAte(org.bonus_ate) >= 0) return { estado: 'ok' }
    return {
      estado: 'bloqueado',
      titulo: 'Seu período de bônus terminou',
      mensagem: 'O bônus fundador expirou. Escolha um plano para manter o acesso do escritório.',
      cta: 'assinar',
    }
  }

  if (s === 'trial') {
    const dias = org.trial_ate ? diasAte(org.trial_ate) : 99
    if (dias < 0) {
      return {
        estado: 'bloqueado',
        titulo: 'Seu período de teste terminou',
        mensagem: 'Escolha um plano para continuar usando o Quotaria — seus dados continuam salvos.',
        cta: 'assinar',
      }
    }
    if (dias <= AVISO_TRIAL_DIAS) {
      return {
        estado: 'aviso',
        titulo: dias === 0 ? 'Seu teste termina hoje' : `Seu teste termina em ${dias} dia(s)`,
        mensagem: 'Assine agora para não perder o acesso ao escritório.',
        cta: 'assinar',
      }
    }
    return { estado: 'ok' }
  }

  if (s === 'pendente') {
    return {
      estado: 'aviso',
      titulo: 'Aguardando a confirmação do pagamento',
      mensagem: 'Seu plano está selecionado. Assim que o pagamento for confirmado, o acesso fica ativo — você pode reabrir a fatura a qualquer momento.',
      cta: 'fatura',
    }
  }

  if (s === 'inadimplente') {
    // carência a partir do vencimento; depois dela, pausa
    const diasVencido = org.proximo_vencimento ? -diasAte(org.proximo_vencimento) : 999
    if (diasVencido <= CARENCIA_INADIMPLENTE_DIAS) {
      return {
        estado: 'aviso',
        titulo: 'Pagamento em atraso',
        mensagem: org.proximo_vencimento
          ? `A mensalidade venceu em ${dataBr(org.proximo_vencimento)}. Regularize para manter o acesso — restam ${CARENCIA_INADIMPLENTE_DIAS - diasVencido} dia(s) de tolerância.`
          : 'Regularize o pagamento para manter o acesso.',
        cta: 'fatura',
      }
    }
    return {
      estado: 'bloqueado',
      titulo: 'Acesso pausado por falta de pagamento',
      mensagem: 'A mensalidade segue em aberto. Regularize a fatura para reativar o escritório — seus dados continuam salvos.',
      cta: 'fatura',
    }
  }

  if (s === 'cancelada') {
    return {
      estado: 'bloqueado',
      titulo: 'Assinatura cancelada',
      mensagem: 'Escolha um plano para reativar o acesso do escritório. Seus dados continuam salvos.',
      cta: 'assinar',
    }
  }

  return { estado: 'ok' }
}
