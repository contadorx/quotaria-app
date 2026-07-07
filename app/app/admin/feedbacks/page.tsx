import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, EmptyState, PageHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

type Feedback = { id: string; texto: string; criado_em: string; escritorio: string; email: string | null }

export default async function AdminFeedbacksPage() {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_feedbacks')
  const lista = data as Feedback[] | null

  if (!lista) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio lê os feedbacks.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negócio"
        title="Feedbacks"
        description="Sugestões enviadas pelos contadores na Central de Ajuda — matéria-prima do roadmap."
        back={{ href: '/app/admin', label: 'Painel do negócio' }}
      />
      {lista.length === 0 ? (
        <EmptyState>Nenhum feedback ainda.</EmptyState>
      ) : (
        <div className="space-y-2">
          {lista.map((f) => (
            <Card key={f.id} className="p-4">
              <p className="whitespace-pre-wrap text-sm text-ink">{f.texto}</p>
              <p className="mt-2 text-[11px] text-ink-soft">
                {f.escritorio} · {f.email ?? 'sem e-mail'} · {new Date(f.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
