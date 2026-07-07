import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  formatarData,
  LABEL_TIPO_SOCIETARIO,
  LABEL_STATUS_HOLDING,
  LABEL_PAPEL_FAMILIAR,
  LABEL_REGIME_BENS,
} from '@/lib/format'
import { createHolding, createSocio } from '../../actions'

export default async function FamilyDetail({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: family } = await supabase
    .from('families')
    .select('id, name, notes, created_at')
    .eq('id', params.id)
    .single()

  if (!family) notFound()

  const { data: socios } = await supabase
    .from('socios')
    .select('id, nome, papel_familiar, regime_bens, cpf')
    .eq('family_id', params.id)
    .order('nome')

  const { data: holdings } = await supabase
    .from('holdings')
    .select('id, razao_social, cnpj, tipo_societario, status, created_at')
    .eq('family_id', params.id)
    .order('razao_social')

  const inputClass =
    'mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-gold'

  return (
    <div>
      <Link href="/app" className="text-sm text-navy/50 transition hover:text-navy">
        ← Famílias
      </Link>

      <h1 className="mt-3 font-serif text-3xl text-navy">{family.name}</h1>
      <p className="mt-1 text-xs text-navy/40">
        cadastrada em {formatarData(family.created_at)}
      </p>

      {searchParams?.error && (
        <p className="mt-4 text-sm font-medium text-red-700">{searchParams.error}</p>
      )}

      {/* ===================== SÓCIOS ===================== */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/80">
        Sócios
      </h2>

      <form className="mt-4 grid gap-3 rounded-lg border border-navy/10 bg-white/50 p-5 sm:grid-cols-2">
        <input type="hidden" name="family_id" value={family.id} />
        <div>
          <label htmlFor="nome" className="block text-xs font-medium text-navy/70">
            Nome
          </label>
          <input id="nome" name="nome" required placeholder="Ex.: Roberto Andrade" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cpf" className="block text-xs font-medium text-navy/70">
            CPF (opcional)
          </label>
          <input id="cpf" name="cpf" placeholder="000.000.000-00" className={inputClass} />
        </div>
        <div>
          <label htmlFor="papel_familiar" className="block text-xs font-medium text-navy/70">
            Papel na família
          </label>
          <select id="papel_familiar" name="papel_familiar" className={inputClass}>
            <option value="">—</option>
            {Object.entries(LABEL_PAPEL_FAMILIAR).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="regime_bens" className="block text-xs font-medium text-navy/70">
            Regime de bens
          </label>
          <select id="regime_bens" name="regime_bens" className={inputClass}>
            <option value="">—</option>
            {Object.entries(LABEL_REGIME_BENS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            formAction={createSocio}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy-soft"
          >
            Adicionar sócio
          </button>
        </div>
      </form>

      <div className="mt-4">
        {!socios || socios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-navy/20 p-6 text-center text-sm text-navy/50">
            Nenhum sócio cadastrado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-navy/10 overflow-hidden rounded-lg border border-navy/10 bg-white/50">
            {socios.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <span className="font-medium text-navy">{s.nome}</span>
                <span className="text-xs text-navy/50">
                  {s.papel_familiar ? LABEL_PAPEL_FAMILIAR[s.papel_familiar] : '—'}
                  {s.regime_bens ? ` · ${LABEL_REGIME_BENS[s.regime_bens]}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===================== HOLDINGS ===================== */}
      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-navy/80">
        Holdings
      </h2>

      <form className="mt-4 grid gap-3 rounded-lg border border-navy/10 bg-white/50 p-5 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="family_id" value={family.id} />
        <div>
          <label htmlFor="razao_social" className="block text-xs font-medium text-navy/70">
            Razão social
          </label>
          <input id="razao_social" name="razao_social" required placeholder="Ex.: Andrade Participações Ltda" className={inputClass} />
        </div>
        <div>
          <label htmlFor="tipo_societario" className="block text-xs font-medium text-navy/70">
            Tipo
          </label>
          <select id="tipo_societario" name="tipo_societario" className={inputClass}>
            <option value="ltda">Ltda</option>
            <option value="sa">S/A</option>
          </select>
        </div>
        <div>
          <label htmlFor="cnpj" className="block text-xs font-medium text-navy/70">
            CNPJ (opcional)
          </label>
          <input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" className={inputClass} />
        </div>
        <button
          formAction={createHolding}
          className="self-end rounded-md bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy-soft"
        >
          Adicionar
        </button>
      </form>

      <div className="mt-4">
        {!holdings || holdings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-navy/20 p-6 text-center text-sm text-navy/50">
            Nenhuma holding nesta família ainda.
          </div>
        ) : (
          <ul className="divide-y divide-navy/10 overflow-hidden rounded-lg border border-navy/10 bg-white/50">
            {holdings.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/app/holdings/${h.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-navy/[0.03]"
                >
                  <span>
                    <span className="font-medium text-navy">{h.razao_social}</span>
                    <span className="ml-2 text-xs text-navy/40">
                      {LABEL_TIPO_SOCIETARIO[h.tipo_societario]}
                      {h.cnpj ? ` · ${h.cnpj}` : ''}
                    </span>
                  </span>
                  <span className="text-xs text-navy/40">
                    {LABEL_STATUS_HOLDING[h.status]} →
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
