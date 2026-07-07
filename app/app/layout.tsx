import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Wordmark } from '@/components/brand'
import { signout } from './actions'

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
      <header className="border-b border-navy/10 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <a href="/app" className="font-serif text-lg text-navy">
            <Wordmark />
          </a>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/50">{user.email}</span>
            <form action={signout}>
              <button className="rounded-md border border-navy/15 px-3 py-1 text-navy/70 transition hover:bg-navy/5">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
