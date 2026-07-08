'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const numOrNull = (v: string) => (v === '' ? null : Number(v.replace(',', '.')))
const intOrNull = (v: string) => (v === '' ? null : parseInt(v, 10))

export async function salvarCupom(formData: FormData) {
  const supabase = createClient()
  const id = str(formData, 'id')
  const codigo = str(formData, 'codigo').toUpperCase()
  const tipo = str(formData, 'tipo')
  const valor = numOrNull(str(formData, 'valor'))
  if (!codigo || !tipo || valor === null) {
    redirect('/app/admin/cupons?error=' + encodeURIComponent('Código, tipo e valor são obrigatórios.'))
  }
  const dados = {
    codigo,
    tipo,
    valor,
    duracao_meses: intOrNull(str(formData, 'duracao_meses')), // vazio = para sempre
    validade: str(formData, 'validade') || null,
    limite_usos: intOrNull(str(formData, 'limite_usos')),
    ativo: formData.get('ativo') === 'on',
    observacoes: str(formData, 'observacoes') || null,
  }
  const { error } = id
    ? await supabase.from('cupons').update(dados).eq('id', id)
    : await supabase.from('cupons').insert(dados)
  if (error) {
    const msg = error.message.includes('duplicate') ? 'Já existe um cupom com esse código.' : error.message
    redirect('/app/admin/cupons?error=' + encodeURIComponent(msg))
  }
  revalidatePath('/app/admin/cupons')
  redirect('/app/admin/cupons?message=' + encodeURIComponent('Cupom salvo.'))
}

export async function excluirCupom(formData: FormData) {
  const supabase = createClient()
  await supabase.from('cupons').delete().eq('id', str(formData, 'id'))
  revalidatePath('/app/admin/cupons')
  redirect('/app/admin/cupons?message=' + encodeURIComponent('Cupom removido.'))
}
