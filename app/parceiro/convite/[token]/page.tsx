import { createClient } from '@/lib/supabase/server'
import { LogoMark, Wordmark } from '@/components/brand'
import { fieldClass } from '@/components/ui'
import { PendingButton } from '@/components/submit-button'
import { aceitarConviteAdvogado, entrarParceiro, criarContaParceiro, sairParceiro } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function ConviteAdvogado({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { error?: string; message?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark />
          <div>
            <Wordmark className="text-xl text-ink" />
            <p className="text-xs text-ink-muted">Acesso do advogado</p>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-white p-6 shadow-card">
          <h1 className="text-lg font-bold text-ink">Você foi convidado como advogado parceiro</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Acesso à(s) família(s) que o escritório compartilhou com você — no nível definido por ele (leitura ou contribuição).
          </p>

          {searchParams?.error && <p className="mt-4 text-sm font-medium text-red-600">{searchParams.error}</p>}
          {searchParams?.message && <p className="mt-4 text-sm font-medium text-emerald-600">{searchParams.message}</p>}

          {user ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-ink">Entrando como <strong>{user.email}</strong>.</p>
              <form>
                <input type="hidden" name="token" value={params.token} />
                <PendingButton action={aceitarConviteAdvogado} className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft">
                  Entrar
                </PendingButton>
              </form>
              <form>
                <PendingButton action={sairParceiro} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface">
                  Não sou eu — sair
                </PendingButton>
              </form>
            </div>
          ) : (
            <form className="mt-5 space-y-4">
              <input type="hidden" name="token" value={params.token} />
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-ink-muted">E-mail</label>
                <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-ink-muted">Senha</label>
                <input id="password" name="password" type="password" required minLength={6} className={fieldClass} />
              </div>
              <div className="flex gap-3">
                <PendingButton action={entrarParceiro} className="flex-1 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft">Entrar</PendingButton>
                <PendingButton action={criarContaParceiro} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface">Criar conta</PendingButton>
              </div>
              <p className="text-[11px] text-ink-soft">Primeira vez? Crie uma conta com o e-mail deste convite.</p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
