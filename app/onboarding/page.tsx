import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoMark, Wordmark } from '@/components/brand'
import { fieldClass } from '@/components/ui'
import { criarEscritorio } from './actions'

export default async function Onboarding({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase.rpc('current_org')
  if (org) redirect('/app')

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark />
          <div>
            <Wordmark className="text-xl text-ink" />
            <p className="text-xs text-ink-muted">Configuração inicial</p>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-white p-6 shadow-card">
          <h1 className="text-lg font-bold text-ink">Crie o seu escritório</h1>
          <p className="mt-1 text-sm text-ink-muted">
            É a sua contabilidade dentro do Quotaria: as famílias, holdings e documentos
            pertencem ao escritório, e você poderá convidar colaboradores depois.
          </p>

          <form className="mt-5 space-y-4">
            <div>
              <label htmlFor="nome" className="block text-xs font-medium text-ink-muted">
                Nome do escritório *
              </label>
              <input id="nome" name="nome" required placeholder="Ex.: Oliveira Contabilidade" className={fieldClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cnpj" className="block text-xs font-medium text-ink-muted">CNPJ (opcional)</label>
                <input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="crc" className="block text-xs font-medium text-ink-muted">CRC (opcional)</label>
                <input id="crc" name="crc" placeholder="CRC-SP 000000" className={fieldClass} />
              </div>
            </div>

            {searchParams?.error && (
              <p className="text-sm font-medium text-red-600">{searchParams.error}</p>
            )}

            <button
              formAction={criarEscritorio}
              className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft"
            >
              Criar escritório e entrar
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          Recebeu um convite de um escritório? Abra o link do convite — não crie um escritório novo.
        </p>
      </div>
    </main>
  )
}
