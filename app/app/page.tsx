import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarData } from '@/lib/format'
import { createFamily } from './actions'
import { PageHeader, Card, ListCard, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'

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
      <PageHeader
        eyebrow="Cadastro"
        title="Famílias"
        description="Cada família agrupa suas holdings, sócios e patrimônio."
      />

      <Card className="p-5">
        <form className="flex flex-wrap items-end gap-3">
          <div className="grow">
            <Label htmlFor="name">Nova família</Label>
            <input id="name" name="name" required placeholder="Ex.: Família Andrade" className={fieldClass} />
          </div>
          <SubmitButton action={createFamily}>Adicionar</SubmitButton>
        </form>
        {searchParams?.error && (
          <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>
        )}
      </Card>

      <div className="mt-6">
        {!families || families.length === 0 ? (
          <EmptyState>Nenhuma família cadastrada ainda.</EmptyState>
        ) : (
          <ListCard>
            {families.map((f) => (
              <Link
                key={f.id}
                href={`/app/familias/${f.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-surface"
              >
                <span className="font-semibold text-ink">{f.name}</span>
                <span className="flex items-center gap-3 text-xs text-ink-soft">
                  criada em {formatarData(f.created_at)}
                  <ChevronRight size={16} />
                </span>
              </Link>
            ))}
          </ListCard>
        )}
      </div>
    </div>
  )
}
