import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Busca global no escritório (RLS já isola por organização).
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ familias: [], holdings: [], socios: [], radar: [] })
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const like = `%${q}%`
  const [familias, holdings, socios, radar] = await Promise.all([
    supabase.from('families').select('id, name').ilike('name', like).limit(5),
    supabase.from('holdings').select('id, razao_social, nome_fantasia, cnpj').or(`razao_social.ilike.${like},nome_fantasia.ilike.${like},cnpj.ilike.${like}`).limit(5),
    supabase.from('socios').select('id, nome, family_id').ilike('nome', like).limit(5),
    supabase.from('radar_clientes').select('id, nome').ilike('nome', like).neq('status', 'descartado').limit(5),
  ])

  return NextResponse.json({
    familias: familias.data ?? [],
    holdings: holdings.data ?? [],
    socios: socios.data ?? [],
    radar: radar.data ?? [],
  })
}
