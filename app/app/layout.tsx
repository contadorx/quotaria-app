import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { avaliarAcesso, type AcessoOrg } from '@/lib/acesso'
import { AcessoBloqueado } from '@/components/acesso-bloqueado'
import { AcessoBanner } from '@/components/acesso-banner'
import type { PlanoId } from '@/lib/planos'
import type { Ciclo } from '@/lib/asaas'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select('nome, assinatura_status, is_teste, trial_ate, bonus_ate, proximo_vencimento, plano, ciclo_cobranca, asaas_subscription_id')
    .eq('id', orgId)
    .single()

  const { data: membro } = await supabase
    .from('organization_members')
    .select('super_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: souAdmin } = await supabase.rpc('is_org_admin')

  const colapsadoInicial = cookies().get('quotaria_sidebar')?.value === 'col'
  // o dono da plataforma (super admin) nunca é paywalled na própria ferramenta
  const acesso = org && membro?.super_admin !== true
    ? avaliarAcesso(org as AcessoOrg)
    : { estado: 'ok' as const }

  const shellProps = {
    email: user.email ?? '',
    orgNome: org?.nome ?? 'Escritório',
    colapsadoInicial,
    superAdmin: membro?.super_admin === true,
  }

  // ACESSO PAUSADO — mostra a tela de regularização no lugar do app (a saída
  // está ali: assinar/pagar). Continua dentro do AppShell para manter o sair.
  if (acesso.estado === 'bloqueado') {
    return (
      <AppShell {...shellProps}>
        <AcessoBloqueado
          acesso={acesso}
          souAdmin={souAdmin === true}
          status={org?.assinatura_status ?? 'trial'}
          plano={(org?.plano as PlanoId | null) ?? null}
          ciclo={(org?.ciclo_cobranca as Ciclo | null) ?? null}
          temAssinatura={Boolean(org?.asaas_subscription_id)}
          proximoVencimento={org?.proximo_vencimento ?? null}
        />
      </AppShell>
    )
  }

  return (
    <AppShell {...shellProps}>
      {acesso.estado === 'aviso' && acesso.titulo && (
        <AcessoBanner titulo={acesso.titulo} mensagem={acesso.mensagem ?? ''} cta={acesso.cta} />
      )}
      {children}
    </AppShell>
  )
}
