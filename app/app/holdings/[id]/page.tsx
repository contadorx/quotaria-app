import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  formatarData,
  LABEL_TIPO_SOCIETARIO,
  LABEL_STATUS_HOLDING,
  LABEL_TIPO_DIREITO,
  LABEL_CLASSE_QUOTA,
} from '@/lib/format'
import { createQuota } from '../../actions'

export default async function HoldingDetail({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: holding } = await supabase
    .from('holdings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!holding) notFound()

  const { data: family } = await supabase
    .from('families')
    .select('id, name')
    .eq('id', holding.family_id)
    .single()

  // sócios da família (para o seletor de quotas)
  const { data: socios } = await supabase
    .from('socios')
    .select('id, nome')
    .eq('family_id', holding.family_id)
    .order('nome')

  // quotas desta holding
  const { data: quotas } = await supabase
    .from('quotas')
    .select('id, socio_id, quantidade, percentual, tipo_direito, classe')
    .eq('holding_id', params.id)
    .order('created_at')

  const nomePorSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const temSocios = (socios ?? []).length > 0

  const inputClass =
    'mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-gold'

  const subsecoes = ['Bens', 'Cláusulas']

  return (
    <div>
      <Link
        href={family ? `/app/familias/${family.id}` : '/app'}
        className="text-sm text-navy/50 transition hover:text-navy"
      >
        ← {family?.name ?? 'Famílias'}
      </Link>

      <h1 className="mt-3 font-serif text-3xl text-navy">{holding.razao_social}</h1>

      <dl className="mt-6 grid max-w-lg grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Info label="Tipo" value={LABEL_TIPO_SOCIETARIO[holding.tipo_societario]} />
        <Info label="Status" value={LABEL_STATUS_HOLDING[holding.status]} />
        <Info label="CNPJ" value={holding.cnpj ?? '—'} />
        <Info label="Constituição" value={formatarData(holding.data_constituicao)} />
      </dl>

      <div className="mt-10 h-px w-16 bg-gold" />

      {searchParams?.error && (
        <p className="mt-6 text-sm font-medium text-red-700">{searchParams.error}</p>
      )}

      {/* ===================== QUOTAS ===================== */}
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-navy/80">
        Quotas
      </h2>
      <p className="mt-1 text-xs text-navy/50">
        Usufruto e nua-propriedade sobre a mesma fração entram como duas linhas
        (uma para cada sócio).
      </p>

      {!temSocios ? (
        <div className="mt-4 rounded-lg border border-dashed border-navy/20 p-6 text-sm text-navy/60">
          Cadastre sócios na família antes de atribuir quotas.{' '}
          {family && (
            <Link
              href={`/app/familias/${family.id}`}
              className="font-medium text-navy underline-offset-2 hover:underline"
            >
              Ir para a família →
            </Link>
          )}
        </div>
      ) : (
        <form className="mt-4 grid gap-3 rounded-lg border border-navy/10 bg-white/50 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="holding_id" value={holding.id} />
          <div className="lg:col-span-2">
            <label htmlFor="socio_id" className="block text-xs font-medium text-navy/70">
              Sócio
            </label>
            <select id="socio_id" name="socio_id" required className={inputClass}>
              {(socios ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quantidade" className="block text-xs font-medium text-navy/70">
              Quantidade
            </label>
            <input id="quantidade" name="quantidade" type="number" step="0.0001" min="0" defaultValue="0" className={inputClass} />
          </div>
          <div>
            <label htmlFor="percentual" className="block text-xs font-medium text-navy/70">
              % (opcional)
            </label>
            <input id="percentual" name="percentual" type="number" step="0.0001" min="0" max="100" placeholder="50" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tipo_direito" className="block text-xs font-medium text-navy/70">
              Direito
            </label>
            <select id="tipo_direito" name="tipo_direito" className={inputClass}>
              {Object.entries(LABEL_TIPO_DIREITO).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button
              formAction={createQuota}
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy-soft"
            >
              Adicionar quota
            </button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {!quotas || quotas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-navy/20 p-6 text-center text-sm text-navy/50">
            Nenhuma quota lançada ainda.
          </div>
        ) : (
          <ul className="divide-y divide-navy/10 overflow-hidden rounded-lg border border-navy/10 bg-white/50">
            {quotas.map((q) => (
              <li key={q.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-navy">
                  {nomePorSocio.get(q.socio_id) ?? 'Sócio removido'}
                </span>
                <span className="text-navy/60">
                  {q.quantidade} quotas
                  {q.percentual != null ? ` · ${q.percentual}%` : ''}
                  {' · '}
                  <span className="text-navy/80">{LABEL_TIPO_DIREITO[q.tipo_direito]}</span>
                  {q.classe ? ` · ${LABEL_CLASSE_QUOTA[q.classe]}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===================== PRÓXIMA ETAPA ===================== */}
      <div className="mt-12 grid gap-3 sm:grid-cols-2">
        {subsecoes.map((s) => (
          <div
            key={s}
            className="rounded-lg border border-dashed border-navy/20 p-5 text-sm text-navy/50"
          >
            <span className="font-medium text-navy/70">{s}</span>
            <p className="mt-1 text-xs text-navy/40">Próxima etapa.</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-navy/40">{label}</dt>
      <dd className="mt-0.5 text-navy">{value}</dd>
    </div>
  )
}
