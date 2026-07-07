import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader } from '@/components/ui'
import { ReguaAdmin, type PassoRegua } from '@/components/admin/regua-admin'

export const dynamic = 'force-dynamic'

type Reguas = {
  cobranca: { ativa: boolean; passos: PassoRegua[]; enviados_30d: number }
  comunicacao: { ativa: boolean; passos: PassoRegua[]; enviados_30d: number }
}

export default async function ComunicacaoPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_reguas')
  const r = data as Reguas | null

  if (!r) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio configura a comunicação.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negócio"
        title="Régua de comunicação"
        description="O ciclo de vida do assinante: toques de conversão durante o trial (após o cadastro) e de retenção após a ativação. Um e-mail por toque, nunca repetido."
        back={{ href: '/app/admin', label: 'Painel do negócio' }}
      />
      {searchParams?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {searchParams.error}
        </p>
      )}
      <ReguaAdmin
        tipo="comunicacao"
        ativa={r.comunicacao.ativa}
        passos={r.comunicacao.passos}
        enviados30d={r.comunicacao.enviados_30d}
      />
      <p className="text-[11px] text-ink-soft">
        Toques "após o cadastro" só chegam a quem está em trial; toques "após a ativação" só a
        assinaturas ativas. Quem muda de estágio simplesmente para de receber a etapa anterior.
      </p>
    </div>
  )
}
