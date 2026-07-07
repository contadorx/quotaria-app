'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? '').trim()
}
function dataOuNull(fd: FormData, k: string) {
  const v = s(fd, k)
  return v ? v : null
}

export async function updateAssinatura(formData: FormData) {
  const orgId = s(formData, 'org_id')
  if (!orgId) redirect('/app/admin')

  const valor = Number(s(formData, 'valor_mensal').replace(',', '.'))
  if (!Number.isFinite(valor) || valor < 0) {
    redirect('/app/admin?error=' + encodeURIComponent('Valor mensal inválido.'))
  }

  const supabase = createClient()
  const { error } = await supabase.rpc('admin_atualizar_assinatura', {
    p_org: orgId,
    p_status: s(formData, 'status') || 'trial',
    p_plano: s(formData, 'plano') || 'profissional',
    p_valor: valor,
    p_ciclo: s(formData, 'ciclo') || 'mensal',
    p_trial_ate: dataOuNull(formData, 'trial_ate'),
    p_bonus_ate: dataOuNull(formData, 'bonus_ate'),
    p_proximo_vencimento: dataOuNull(formData, 'proximo_vencimento'),
    p_is_teste: formData.get('is_teste') === 'on',
    p_parceiro_ref: dataOuNull(formData, 'parceiro_ref'),
    p_obs: dataOuNull(formData, 'obs_admin'),
    p_asaas_customer: dataOuNull(formData, 'asaas_customer_id'),
    p_asaas_subscription: dataOuNull(formData, 'asaas_subscription_id'),
  })

  if (error) redirect('/app/admin?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin')
  redirect('/app/admin')
}
