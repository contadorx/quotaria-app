import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, ListCard, EmptyState } from '@/components/ui'

export default async function RelatoriosPage() {
  const supabase = createClient()
  const { data: families } = await supabase.from('families').select('id, name').order('name')
  const ano = new Date().getFullYear()

  return (
    <div>
      <PageHeader
        eyebrow="Entregável"
        title="Relatórios"
        description="O relatório anual white-label que a família recebe — consolida estrutura, o que foi feito no ano, sucessão em andamento e o radar da Reforma. O serviço invisível vira lista visível."
      />
      {!families || families.length === 0 ? (
        <EmptyState>Cadastre uma família para gerar o relatório dela.</EmptyState>
      ) : (
        <ListCard>
          {families.map((f) => (
            <Link key={f.id} href={`/app/relatorios/${f.id}`} className="flex items-center justify-between px-5 py-4 transition hover:bg-surface">
              <span className="font-semibold text-ink">{f.name}</span>
              <span className="flex items-center gap-3 text-xs text-ink-soft">
                Relatório {ano} <ChevronRight size={16} />
              </span>
            </Link>
          ))}
        </ListCard>
      )}
    </div>
  )
}
