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

  const colapsadoInicial = cookies().get('quotaria_sidebar')?.value === 'col'

  return (
    <AppShell email={user.email ?? ''} colapsadoInicial={colapsadoInicial}>
      {children}
    </AppShell>
  )
}
