import { ConnectionTest } from '@/components/connection-test'
import { LogoMark, Wordmark } from '@/components/brand'
import { Card } from '@/components/ui'

export default function Home() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-5 flex items-center gap-3">
        <LogoMark />
        <Wordmark className="text-2xl text-ink" />
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
        Fundação · Fase 1
      </div>
      <p className="mt-3 max-w-md text-ink-muted">
        Infraestrutura do honorário premium. Este é o esqueleto do sistema — o pipeline
        (Next.js → GitHub → Vercel) e a conexão com o Supabase.
      </p>

      <Card className="mt-8 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Status do ambiente
        </h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">Supabase configurado (.env.local)</span>
          <span className={configured ? 'font-semibold text-emerald-600' : 'font-medium text-ink-soft'}>
            {configured ? '✓ sim' : '— pendente'}
          </span>
        </div>
        <div className="mt-5">
          <ConnectionTest configured={configured} />
        </div>
      </Card>

      <footer className="mt-10 flex items-center gap-4 text-xs text-ink-soft">
        <span>ContadorX · uso interno</span>
        <a href="/login" className="font-medium text-navy underline-offset-2 transition hover:underline">
          Entrar →
        </a>
      </footer>
    </main>
  )
}
