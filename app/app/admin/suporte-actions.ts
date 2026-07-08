'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? '').trim()
}

export async function responderTicket(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_suporte_responder', {
    p_conversa: s(formData, 'conversa_id'),
    p_texto: s(formData, 'texto'),
  })
  if (error) redirect('/app/admin/suporte?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/suporte')
  redirect('/app/admin/suporte')
}

export async function mudarStatusTicket(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_suporte_status', {
    p_conversa: s(formData, 'conversa_id'),
    p_status: s(formData, 'status'),
  })
  if (error) redirect('/app/admin/suporte?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/suporte')
  redirect('/app/admin/suporte')
}

export async function salvarFaq(formData: FormData) {
  const supabase = createClient()
  const ordem = Number(s(formData, 'ordem'))
  const { error } = await supabase.rpc('admin_faq_salvar', {
    p_id: s(formData, 'id') || null,
    p_categoria: s(formData, 'categoria') || null,
    p_pergunta: s(formData, 'pergunta'),
    p_resposta: s(formData, 'resposta'),
    p_destaque: formData.get('destaque') === 'on',
    p_publicado: formData.get('publicado') === 'on',
    p_ordem: Number.isFinite(ordem) ? Math.round(ordem) : 0,
    p_video_url: s(formData, 'video_url') || null,
  })
  if (error) redirect('/app/admin/ajuda?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/ajuda')
  redirect('/app/admin/ajuda')
}

export async function excluirFaq(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_faq_excluir', { p_id: s(formData, 'id') })
  if (error) redirect('/app/admin/ajuda?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/ajuda')
  redirect('/app/admin/ajuda')
}

export async function salvarAssistente(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_assistente_salvar', {
    p_prompt: s(formData, 'system_prompt') || null,
    p_modelo: s(formData, 'modelo') || null,
  })
  if (error) redirect('/app/admin/assistente?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/admin/assistente')
  redirect('/app/admin/assistente?ok=1')
}
