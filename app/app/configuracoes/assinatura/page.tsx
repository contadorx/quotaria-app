import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card } from '@/components/ui'
import { AssinaturaCheckout } from '@/components/assinatura-checkout'
import { asaasFetch } from '@/lib/asaas'
import { formatarMoeda, formatarData } from '@/lib/format'
import type { PlanoId } from '@/lib/planos'
import type { Ciclo } from '@/lib/asaas'

export const dynamic = 'force-dynamic'

type Pagamento = { id: string; value: number; dueDate: string; status: string; paymentDate?: string | null; invoiceUrl?: string | null; bankSlipUrl?: string | null }
type Fatura = { id: string; valor: number; vencimento: string; status: string; url: string | null }

const STATUS: Record<string, { txt: string; cls: string }> = {
  RECEIVED: { txt: 'Paga', cls: 'bg-emerald-50 text-emerald-700' },
  CONFIRMED: { txt: 'Paga', cls: 'bg-emerald-50 text-emerald-700' },
  RECEIVED_IN_CASH: { txt: 'Paga', cls: 'bg-emerald-50 text-emerald-700' },
  PENDING: { txt: 'Pendente', cls: 'bg-amber-50 text-amber-700' },
  OVERDUE: { txt: 'Vencida', cls: 'bg-red-50 text-red-700' },
  REFUNDED: { txt: 'Estornada', cls: 'bg-cream text-navy' },
  REFUND_REQUESTED: { txt: 'Estorno pedido', cls: 'bg-cream text-navy' },
}

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

  // Histórico de faturas (do Asaas). Protegido: se não configurado/indisponível, some.
  let faturas: Fatura[] = []
  let faturasErro = false
  if (souAdmin && org.asaas_subscription_id) {
    try {
      const r = await asaasFetch<{ data: Pagamento[] }>(`/subscriptions/${org.asaas_subscription_id}/payments?limit=24`)
      faturas = (r?.data ?? [])
        .map((p) => ({ id: p.id, valor: Number(p.value), vencimento: p.dueDate, status: p.status, url: p.invoiceUrl ?? p.bankSlipUrl ?? null }))
        .sort((a, b) => (b.vencimento ?? '').localeCompare(a.vencimento ?? ''))
    } catch {
      faturasErro = true
    }
  }

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
        <>
          <AssinaturaCheckout
            statusInicial={org.assinatura_status}
            planoInicial={(org.plano as PlanoId | null) ?? null}
            cicloInicial={(org.ciclo_cobranca as Ciclo | null) ?? null}
            temAssinatura={Boolean(org.asaas_subscription_id)}
            proximoVencimento={org.proximo_vencimento}
          />

          {org.asaas_subscription_id && (
            <div className="mt-8">
              <h2 className="text-sm font-bold text-ink">Suas faturas</h2>
              <Card className="mt-3 p-0">
                {faturasErro ? (
                  <p className="px-5 py-4 text-sm text-ink-muted">Não foi possível carregar as faturas agora. Tente novamente em instantes.</p>
                ) : faturas.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-ink-muted">Nenhuma fatura emitida ainda. A primeira aparece assim que a cobrança é gerada.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {faturas.map((f) => {
                      const s = STATUS[f.status] ?? { txt: f.status, cls: 'bg-cream text-navy' }
                      return (
                        <div key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                          <span className="w-28 text-ink">{formatarData(f.vencimento)}</span>
                          <span className="w-28 font-medium text-ink">{formatarMoeda(f.valor)}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.txt}</span>
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline">
                              <ExternalLink size={13} /> {f.status === 'PENDING' || f.status === 'OVERDUE' ? 'pagar / 2ª via' : 'ver fatura'}
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
              <p className="mt-2 text-[11px] text-ink-soft">Faturas geradas e cobradas pelo Asaas. O status atualiza automaticamente quando o pagamento é confirmado.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
