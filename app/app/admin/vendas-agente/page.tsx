import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, SubmitButton, fieldClass, Label } from '@/components/ui'
import { PERSONA_VENDAS_PADRAO } from '@/lib/vendas'
import { salvarAgenteVendas } from '../vendas-actions'

export const dynamic = 'force-dynamic'

type Cfg = { system_prompt: string | null; modelo: string | null; ativo: boolean }

export default async function AdminVendasAgentePage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_vendas')
  const cfg = data as Cfg | null
  if (!cfg) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio controla o agente de vendas.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negócio"
        title="Agente de vendas (site)"
        description="O chat que atende os visitantes nas páginas do site (quotaria.com.br). A persona é controlada aqui; deixe em branco para usar a padrão."
        back={{ href: '/app/admin', label: 'Painel do negócio' }}
      />
      {searchParams?.error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{searchParams.error}</p>}
      {searchParams?.ok && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">Agente atualizado.</p>}

      <Card className="p-5">
        <form className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="ativo" defaultChecked={cfg.ativo} className="h-4 w-4 rounded border-line" />
            Chat de vendas ativo no site
          </label>
          <div>
            <Label htmlFor="prompt">Persona (system prompt)</Label>
            <textarea id="prompt" name="system_prompt" rows={14} defaultValue={cfg.system_prompt ?? ''} placeholder="Em branco = persona padrão (abaixo)." className={fieldClass} />
          </div>
          <div className="max-w-xs">
            <Label htmlFor="modelo">Modelo (opcional)</Label>
            <input id="modelo" name="modelo" defaultValue={cfg.modelo ?? ''} placeholder="claude-sonnet-4-6" className={fieldClass} />
          </div>
          <SubmitButton action={salvarAgenteVendas}>Salvar</SubmitButton>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-bold text-ink">Persona padrão (referência)</h2>
        <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">{PERSONA_VENDAS_PADRAO}</pre>
      </Card>

      <p className="text-[11px] text-ink-soft">
        O chat usa a mesma chave de IA (ANTHROPIC_API_KEY). É um endpoint público chamado pelo site — as regras de compliance
        (sem "blindagem", valores como estimativa, sem consultoria jurídica) estão embutidas e valem mesmo se você reescrever a persona.
      </p>
    </div>
  )
}
