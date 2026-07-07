import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, SubmitButton, fieldClass, Label } from '@/components/ui'
import { PERSONA_PADRAO } from '@/lib/assistente'
import { salvarAssistente } from '@/app/app/admin/suporte-actions'

export const dynamic = 'force-dynamic'

type Cfg = { system_prompt: string | null; modelo: string | null; atualizado_em: string | null }

export default async function AdminAssistentePage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string }
}) {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_assistente')
  const cfg = data as Cfg | null

  if (!cfg) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio configura o assistente.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negócio"
        title="Assistente de suporte"
        description="A persona que atende os contadores dentro do sistema. Deixe em branco para usar a persona padrão do Quotaria."
        back={{ href: '/app/admin', label: 'Painel do negócio' }}
      />
      {searchParams?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {searchParams.error}
        </p>
      )}
      {searchParams?.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          Assistente atualizado.
        </p>
      )}

      <Card className="p-5">
        <form className="space-y-3">
          <div>
            <Label htmlFor="prompt">Persona (system prompt)</Label>
            <textarea
              id="prompt"
              name="system_prompt"
              rows={14}
              defaultValue={cfg.system_prompt ?? ''}
              placeholder="Em branco = persona padrão do Quotaria (abaixo)."
              className={fieldClass}
            />
          </div>
          <div className="max-w-xs">
            <Label htmlFor="modelo">Modelo (opcional)</Label>
            <input
              id="modelo"
              name="modelo"
              type="text"
              defaultValue={cfg.modelo ?? ''}
              placeholder="padrão: claude-sonnet-4-6"
              className={fieldClass}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink-soft">
              {cfg.atualizado_em
                ? `Última alteração: ${new Date(cfg.atualizado_em).toLocaleString('pt-BR')}`
                : ''}
            </p>
            <SubmitButton action={salvarAssistente}>Salvar</SubmitButton>
          </div>
        </form>
      </Card>

      <details className="rounded-xl2 border border-line bg-white p-5 shadow-card">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Ver a persona padrão</summary>
        <pre className="mt-3 whitespace-pre-wrap text-xs text-ink-muted">{PERSONA_PADRAO}</pre>
      </details>
      <p className="text-[11px] text-ink-soft">
        O formato de saída (JSON com a decisão de escalar) e a base de conhecimento entram automaticamente —
        a persona não precisa mencioná-los.
      </p>
    </div>
  )
}
