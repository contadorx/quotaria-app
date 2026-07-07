import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoMark, Wordmark } from '@/components/brand'
import { aceitarConvite } from './actions'
import { PendingButton } from '@/components/submit-button'

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: convites } = await supabase.rpc('ver_convite', { p_token: params.token })
  const convite = convites?.[0]

  const { data: orgAtual } = user ? await supabase.rpc('current_org') : { data: null }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark />
          <Wordmark className="text-xl text-ink" />
        </div>

        <div className="rounded-xl2 border border-line bg-white p-6 shadow-card">
          {!convite ? (
            <>
              <h1 className="text-lg font-bold text-ink">Convite não encontrado</h1>
              <p className="mt-2 text-sm text-ink-muted">Confira o link com quem enviou — ele pode ter sido removido.</p>
            </>
          ) : convite.invalido ? (
            <>
              <h1 className="text-lg font-bold text-ink">Convite indisponível</h1>
              <p className="mt-2 text-sm text-ink-muted">Este convite já foi utilizado ou expirou. Peça um novo a quem o enviou.</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold text-ink">Você foi convidado(a)</h1>
              <p className="mt-2 text-sm text-ink-muted">
                <strong className="font-semibold text-ink">{convite.organizacao}</strong> convidou{' '}
                <strong className="font-semibold text-ink">{convite.email}</strong> para entrar como{' '}
                {convite.papel === 'admin' ? 'administrador(a)' : 'colaborador(a)'}.
              </p>

              {!user ? (
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-ink-muted">
                    Entre (ou crie sua conta com este e-mail) e <strong className="font-semibold text-ink">volte a este link</strong> para aceitar.
                  </p>
                  <Link href="/login" className="block w-full rounded-lg bg-navy px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-navy-soft">
                    Entrar ou criar conta
                  </Link>
                </div>
              ) : orgAtual ? (
                <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Sua conta já pertence a um escritório — não é possível aceitar este convite com ela.
                </p>
              ) : (
                <form className="mt-5">
                  <input type="hidden" name="token" value={params.token} />
                  {searchParams?.error && <p className="mb-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
                  <PendingButton
                    action={aceitarConvite}
                    className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft"
                  >
                    Aceitar convite e entrar no escritório
                  </PendingButton>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
