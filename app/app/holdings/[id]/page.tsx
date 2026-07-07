import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatarData, LABEL_TIPO_SOCIETARIO, LABEL_STATUS_HOLDING } from '@/lib/format'

export default async function HoldingDetail({
  params,
}: {
  params: { id: string }
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

  const subsecoes = ['Sócios', 'Quotas', 'Bens', 'Cláusulas']

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

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-navy/80">
        Estrutura societário-patrimonial
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
