import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarData } from '@/lib/format'
import { createFamily } from './actions'

export default async function AppHome({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data: families } = await supabase
    .from('families')
    .select('id, name, notes, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
        Cadastro
      </div>
      <h1 className="mt-1 font-serif text-3xl text-navy">Suas famílias</h1>
      <p className="mt-2 max-w-lg text-sm text-navy/60">
        Cada família agrupa suas holdings, sócios e patrimônio. Comece cadastrando
        um grupo familiar.
      </p>

      {/* nova família */}
      <form className="mt-8 flex flex-wrap items-end gap-3">
        <div className="grow">
          <label htmlFor="name" className="block text-sm font-medium text-navy/80">
            Nova família
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Ex.: Família Andrade"
            className="mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-navy outline-none transition focus:border-gold"
          />
        </div>
        <button
          formAction={createFamily}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy-soft"
        >
          Adicionar
        </button>
      </form>
      {searchParams?.error && (
        <p className="mt-2 text-sm font-medium text-red-700">{searchParams.error}</p>
      )}

      {/* lista */}
      <div className="mt-8">
        {!families || families.length === 0 ? (
          <div className="rounded-lg border border-dashed border-navy/20 p-8 text-center text-sm text-navy/50">
            Nenhuma família cadastrada ainda.
          </div>
        ) : (
          <ul className="divide-y divide-navy/10 overflow-hidden rounded-lg border border-navy/10 bg-white/50">
            {families.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/app/familias/${f.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-navy/[0.03]"
                >
                  <span className="font-medium text-navy">{f.name}</span>
                  <span className="text-xs text-navy/40">
                    criada em {formatarData(f.created_at)} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
