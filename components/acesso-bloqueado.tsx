import { Lock } from 'lucide-react'
import { LogoMark } from '@/components/brand'
import { AssinaturaCheckout } from '@/components/assinatura-checkout'
import { AbrirFaturaButton } from '@/components/abrir-fatura-button'
import type { Acesso } from '@/lib/acesso'
import type { PlanoId } from '@/lib/planos'
import type { Ciclo } from '@/lib/asaas'

export function AcessoBloqueado({
  acesso,
  souAdmin,
  status,
  plano,
  ciclo,
  temAssinatura,
  proximoVencimento,
}: {
  acesso: Acesso
  souAdmin: boolean
  status: string
  plano: PlanoId | null
  ciclo: Ciclo | null
  temAssinatura: boolean
  proximoVencimento: string | null
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl2 bg-navy/5 text-navy">
          <Lock size={22} />
        </div>
        <LogoMark className="hidden" />
        <h1 className="text-2xl font-extrabold text-navy">{acesso.titulo ?? 'Acesso pausado'}</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">{acesso.mensagem}</p>
      </div>

      {!souAdmin ? (
        <div className="rounded-xl2 border border-line bg-white p-6 text-center shadow-card">
          <p className="text-sm text-ink">
            Fale com o dono ou administrador do escritório para regularizar a assinatura. Assim que o
            pagamento for confirmado, o acesso volta automaticamente para toda a equipe.
          </p>
        </div>
      ) : acesso.cta === 'fatura' && temAssinatura ? (
        <div className="rounded-xl2 border border-line bg-white p-6 shadow-card">
          <p className="mb-4 text-sm text-ink">
            Reabra a fatura em aberto para regularizar. Se preferir trocar de plano, escolha abaixo.
          </p>
          <div className="mb-6">
            <AbrirFaturaButton />
          </div>
          <div className="border-t border-line pt-6">
            <AssinaturaCheckout
              statusInicial={status}
              planoInicial={plano}
              cicloInicial={ciclo}
              temAssinatura={temAssinatura}
              proximoVencimento={proximoVencimento}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl2 border border-line bg-white p-6 shadow-card">
          <AssinaturaCheckout
            statusInicial={status}
            planoInicial={plano}
            cicloInicial={ciclo}
            temAssinatura={temAssinatura}
            proximoVencimento={proximoVencimento}
          />
        </div>
      )}
    </div>
  )
}
