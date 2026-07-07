import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, EmptyState, PageHeader, Pill, SubmitButton, fieldClass, Label } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { PendingButton } from '@/components/submit-button'
import { responderTicket, mudarStatusTicket } from '@/app/app/admin/suporte-actions'

export const dynamic = 'force-dynamic'

type Msg = { autor: string; texto: string; criado_em: string }
type Conversa = {
  id: string
  assunto: string
  status: string
  criado_em: string
  atualizado_em: string
  escritorio: string
  email: string | null
  mensagens: Msg[] | null
}
type Suporte = { abertos: number; conversas: Conversa[] }

const STATUS_META: Record<string, string> = {
  aberto: 'bg-red-100 text-red-700',
  respondido: 'bg-emerald-100 text-emerald-800',
  fechado: 'bg-slate-100 text-slate-500',
}

function dataBr(v: string) {
  return new Date(v).toLocaleDateString('pt-BR')
}

export default async function SuportePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_suporte')
  const s = data as Suporte | null

  if (!s) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio vê os chamados.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negócio"
        title="Suporte"
        description={`Chamados encaminhados pelo assistente. ${s.abertos} aguardando resposta.`}
        back={{ href: '/app/admin', label: 'Painel do negócio' }}
      />
      {searchParams?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {searchParams.error}
        </p>
      )}

      {s.conversas.length === 0 ? (
        <EmptyState>Nenhum chamado por enquanto. O assistente resolve o resto sozinho.</EmptyState>
      ) : (
        <div className="space-y-2">
          {s.conversas.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{c.assunto}</p>
                  <p className="text-[11px] text-ink-soft">
                    {c.escritorio} · {c.email ?? 'sem e-mail'} · aberto em {dataBr(c.criado_em)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      STATUS_META[c.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.status}
                  </span>
                  <EditDialog title={`Chamado — ${c.escritorio}`} label="Abrir">
                    <div className="max-h-[55vh] space-y-2 overflow-y-auto p-5 pb-2">
                      {(c.mensagens ?? []).map((m, i) => (
                        <div
                          key={i}
                          className={`rounded-lg px-3 py-2 text-sm ${
                            m.autor === 'equipe'
                              ? 'bg-navy text-white'
                              : m.autor === 'ia'
                                ? 'bg-cream text-navy'
                                : 'bg-surface text-ink'
                          }`}
                        >
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                            {m.autor === 'usuario' ? 'Contador' : m.autor === 'ia' ? 'Assistente' : 'Equipe'}
                          </p>
                          <p className="whitespace-pre-wrap">{m.texto}</p>
                        </div>
                      ))}
                    </div>
                    <form className="space-y-3 border-t border-line p-5">
                      <input type="hidden" name="conversa_id" value={c.id} />
                      <div>
                        <Label htmlFor={`resp-${c.id}`}>Resposta da equipe</Label>
                        <textarea id={`resp-${c.id}`} name="texto" rows={3} className={fieldClass} />
                      </div>
                      <input type="hidden" name="status" value={c.status === 'fechado' ? 'aberto' : 'fechado'} />
                      <div className="flex items-center justify-between gap-2">
                        <PendingButton
                          action={mudarStatusTicket}
                          className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                        >
                          {c.status === 'fechado' ? 'Reabrir' : 'Encerrar chamado'}
                        </PendingButton>
                        <SubmitButton action={responderTicket}>Responder</SubmitButton>
                      </div>
                    </form>
                  </EditDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-[11px] text-ink-soft">
        A resposta da equipe aparece na Central de Ajuda do escritório, no chamado correspondente.
      </p>
    </div>
  )
}
