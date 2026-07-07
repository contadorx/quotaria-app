'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function enviarFeedback(formData: FormData) {
  const texto = String(formData.get('texto') ?? '').trim()
  if (!texto) {
    redirect('/app/ajuda?error=' + encodeURIComponent('Escreva o seu feedback.'))
  }
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: orgId } = await supabase.rpc('current_org')
  if (!user || !orgId) redirect('/app/ajuda')

  const { error } = await supabase.from('feedbacks').insert({
    organization_id: orgId,
    user_id: user.id,
    texto: texto.slice(0, 2000),
  })
  if (error) redirect('/app/ajuda?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/ajuda')
  redirect('/app/ajuda?ok=' + encodeURIComponent('Feedback enviado — obrigado!'))
}
