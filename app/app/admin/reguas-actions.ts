'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? '').trim()
}

function rotaDe(tipo: string) {
  return tipo === 'comunicacao' ? '/app/admin/comunicacao' : '/app/admin/cobranca'
}

export async function toggleRegua(formData: FormData) {
  const tipo = s(formData, 'tipo')
  const rota = rotaDe(tipo)
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_regua_config', {
    p_tipo: tipo,
    p_ativa: s(formData, 'ativa') === 'true',
  })
  if (error) redirect(`${rota}?error=` + encodeURIComponent(error.message))
  revalidatePath(rota)
  redirect(rota)
}

export async function salvarPasso(formData: FormData) {
  const tipo = s(formData, 'tipo')
  const rota = rotaDe(tipo)

  const quando = Number(s(formData, 'quando'))
  if (!Number.isFinite(quando)) {
    redirect(`${rota}?error=` + encodeURIComponent('Informe os dias do toque.'))
  }

  const supabase = createClient()
  const { error } = await supabase.rpc('admin_regua_passo_salvar', {
    p_tipo: tipo,
    p_id: s(formData, 'id') || null,
    p_quando: Math.round(quando),
    p_momento: s(formData, 'momento') || null,
    p_assunto: s(formData, 'assunto'),
    p_corpo: s(formData, 'corpo'),
    p_botao: s(formData, 'botao_texto') || null,
    p_ativo: formData.get('ativo') === 'on',
  })
  if (error) redirect(`${rota}?error=` + encodeURIComponent(error.message))
  revalidatePath(rota)
  redirect(rota)
}

export async function excluirPasso(formData: FormData) {
  const tipo = s(formData, 'tipo')
  const rota = rotaDe(tipo)
  const id = s(formData, 'id')
  if (!id) redirect(rota)
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_regua_passo_excluir', {
    p_tipo: tipo,
    p_id: id,
  })
  if (error) redirect(`${rota}?error=` + encodeURIComponent(error.message))
  revalidatePath(rota)
  redirect(rota)
}
