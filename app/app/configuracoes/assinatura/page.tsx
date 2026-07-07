import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { AssinaturaCheckout } from '@/components/assinatura-checkout'
import type { PlanoId } from '@/lib/planos'
import type { Ciclo } from '@/lib/asaas'

export const dynamic = 'force-dynamic'

export default async function AssinaturaPage() {
  const supabase = createClient()
  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select('assinatura_status, plano, ciclo_cobranca, asaas_subscription_id, proximo_vencimento')
    .eq('id', orgId)
    .single()
  if (!org) redirect('/onboarding')

  const { data: souAdmin } = await supabase.rpc('is_org_admin')

  return (
    <div>
      <Link href="/app/configuracoes" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition hover:text-navy">
        <ChevronLeft size={14} /> Configurações
      </Link>
      <PageHeader
        eyebrow="Escritório"
        title="Assinatura"
        description="Escolha o plano do Quotaria. O pagamento é recorrente via Asaas e a assinatura ativa assim que o pagamento é confirmado."
      />

      {!souAdmin ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Apenas o dono ou administradores do escritório podem gerenciar a assinatura.
        </p>
      ) : (
        <AssinaturaCheckout
          statusInicial={org.assinatura_status}
          planoInicial={(org.plano as PlanoId | null) ?? null}
          cicloInicial={(org.ciclo_cobranca as Ciclo | null) ?? null}
          temAssinatura={Boolean(org.asaas_subscription_id)}
          proximoVencimento={org.proximo_vencimento}
        />
      )}
    </div>
  )
}
