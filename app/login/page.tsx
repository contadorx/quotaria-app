import { login, signup } from './actions'
import { Wordmark } from '@/components/brand'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-4xl text-navy">
        <Wordmark />
      </h1>
      <p className="mt-2 text-sm text-navy/60">Área do contador</p>

      <form className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-navy/80">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-navy outline-none transition focus:border-gold"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-navy/80">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-navy outline-none transition focus:border-gold"
          />
        </div>

        {searchParams?.error && (
          <p className="text-sm font-medium text-red-700">{searchParams.error}</p>
        )}
        {searchParams?.message && (
          <p className="text-sm font-medium text-green-700">{searchParams.message}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            formAction={login}
            className="flex-1 rounded-md bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy-soft"
          >
            Entrar
          </button>
          <button
            formAction={signup}
            className="flex-1 rounded-md border border-navy/20 px-4 py-2 text-sm font-medium text-navy transition hover:bg-navy/5"
          >
            Criar conta
          </button>
        </div>
      </form>

      <a href="/" className="mt-8 text-xs text-navy/40 transition hover:text-navy/70">
        ← voltar
      </a>
    </main>
  )
}
