import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

    const form = await req.formData()
    const familyId = String(form.get('family_id') ?? '')
    const solicitacaoId = String(form.get('solicitacao_id') ?? '') || null
    const observacao = String(form.get('observacao') ?? '').trim() || null
    const file = form.get('file')
    if (!familyId || !(file instanceof File)) {
      return NextResponse.json({ erro: 'Arquivo e família são obrigatórios.' }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ erro: 'Arquivo acima de 15 MB.' }, { status: 400 })
    }

    // Segurança: o usuário precisa ser da família (portal), com convite aceito.
    const { data: acesso } = await supabase
      .from('family_access').select('id, organization_id')
      .eq('family_id', familyId).eq('user_id', user.id).not('aceito_em', 'is', null).maybeSingle()
    if (!acesso) return NextResponse.json({ erro: 'Sem acesso a esta família.' }, { status: 403 })

    const admin = createAdminClient()
    const nome = file.name || 'documento'
    const limpo = nome.replace(/[^\w.\-]+/g, '_').slice(-80)
    const path = `familia/${familyId}/${crypto.randomUUID()}-${limpo}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const up = await admin.storage.from('documentos').upload(path, bytes, {
      contentType: file.type || 'application/octet-stream', upsert: false,
    })
    if (up.error) return NextResponse.json({ erro: 'Falha ao guardar o arquivo.' }, { status: 500 })

    await admin.from('familia_envios').insert({
      organization_id: acesso.organization_id,
      family_id: familyId,
      solicitacao_id: solicitacaoId,
      nome,
      storage_path: path,
      observacao,
    })
    if (solicitacaoId) {
      await admin.from('familia_solicitacoes').update({ status: 'enviado' }).eq('id', solicitacaoId).eq('family_id', familyId)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Falha ao enviar o documento.' }, { status: 500 })
  }
}
