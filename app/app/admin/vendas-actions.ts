'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function salvarAgenteVendas(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_vendas_salvar', {
    p_prompt: String(formData.get('system_prompt') ?? ''),
    p_modelo: String(formData.get('modelo') ?? ''),
    p_ativo: formData.get('ativo') === 'on',
  })
  if (error) redirect('/app/admin/vendas-agente?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/vendas-agente')
  redirect('/app/admin/vendas-agente?ok=1')
}
