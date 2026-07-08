import { login, signup } from './actions'
import { LogoMark, Wordmark } from '@/components/brand'
import { fieldClass } from '@/components/ui'
import { PendingButton } from '@/components/submit-button'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; ref?: string }
}) {
  const ref = (searchParams?.ref ?? '').trim()
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark />
          <div>
            <Wordmark className="text-xl text-ink" />
            <p className="text-xs text-ink-muted">Área do contador</p>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-white p-6 shadow-card">
          <form className="space-y-4">
            {ref && <input type="hidden" name="ref" value={ref} />}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-muted">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-ink-muted">Senha</label>
              <input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="nome_escritorio" className="block text-xs font-medium text-ink-muted">Nome do escritório</label>
              <input id="nome_escritorio" name="nome_escritorio" placeholder="Ex.: Oliveira Contabilidade" autoComplete="organization" className={fieldClass} />
              <p className="mt-1 text-[11px] text-ink-soft">Preencha para criar uma conta nova. Ao entrar, pode deixar em branco.</p>
            </div>

            {searchParams?.error && <p className="text-sm font-medium text-red-600">{searchParams.error}</p>}
            {searchParams?.message && <p className="text-sm font-medium text-emerald-600">{searchParams.message}</p>}

            <div className="flex gap-3 pt-1">
              <PendingButton action={login} className="flex-1 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft">
                Entrar
              </PendingButton>
              <PendingButton action={signup} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface">
                Criar conta
              </PendingButton>
            </div>
          </form>
        </div>

        <a href="/" className="mt-6 inline-block text-xs text-ink-soft transition hover:text-ink">← voltar</a>
      </div>
    </main>
  )
}
