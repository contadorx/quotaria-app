import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, MobileHeader } from '@/components/sidebar'

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

  return (
    <div className="min-h-[100dvh]">
      <Sidebar email={user.email ?? ''} />
      <MobileHeader />
      <div className="md:pl-[240px]">
        <main className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
