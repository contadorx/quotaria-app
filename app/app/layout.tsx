import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'

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
    .select('nome')
    .eq('id', orgId)
    .single()

  const colapsadoInicial = cookies().get('quotaria_sidebar')?.value === 'col'

  return (
    <AppShell
      email={user.email ?? ''}
      orgNome={org?.nome ?? 'Escritório'}
      colapsadoInicial={colapsadoInicial}
    >
      {children}
    </AppShell>
  )
}
