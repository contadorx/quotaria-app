import { ConnectionTest } from '@/components/connection-test'
import { Wordmark } from '@/components/brand'

export default function Home() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold">
        Fundação · Fase 1
      </div>

      <h1 className="font-serif text-5xl leading-none text-navy">
        <Wordmark />
      </h1>

      <p className="mt-4 max-w-md text-navy/70">
        Infraestrutura do honorário premium. Este é o esqueleto do sistema — o
        pipeline (Next.js → GitHub → Vercel) e a conexão com o Supabase. As telas
        do produto entram a partir daqui, uma feature por vez.
      </p>

      <div className="mt-10 h-px w-16 bg-gold" />

      <section className="mt-10 rounded-lg border border-navy/10 bg-white/50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy/80">
          Status do ambiente
        </h2>

        <dl className="mt-4 space-y-2 text-sm">
          <StatusRow label="Supabase configurado (.env.local)" ok={configured} />
        </dl>

        <div className="mt-6">
          <ConnectionTest configured={configured} />
        </div>
      </section>

      <footer className="mt-12 text-xs text-navy/40">
        ContadorX · uso interno
      </footer>
    </main>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-navy/70">{label}</dt>
      <dd className={ok ? 'font-medium text-green-700' : 'font-medium text-navy/40'}>
        {ok ? '✓ sim' : '— pendente'}
      </dd>
    </div>
  )
}
