import { MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, EmptyState, PageHeader, Pill, SectionTitle, SubmitButton, fieldClass, Label } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { ChatSuporte } from '@/components/ajuda/chat-suporte'
import { enviarFeedback } from '@/app/app/ajuda/actions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aguardando a equipe',
  respondido: 'Respondido',
  fechado: 'Encerrado',
}

function dataBr(v: string) {
  const d = new Date(v)
  return d.toLocaleDateString('pt-BR')
}

export default async function AjudaPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string }
}) {
  const supabase = createClient()

  const { data: faq } = await supabase
    .from('faq')
    .select('id, categoria, pergunta, resposta, destaque')
    .eq('publicado', true)
    .order('ordem', { ascending: true })

  const { data: chamados } = await supabase
    .from('suporte_conversas')
    .select('id, assunto, status, atualizado_em')
    .eq('escalada', true)
    .order('atualizado_em', { ascending: false })
    .limit(10)

  const idsChamados = (chamados ?? []).map((c) => c.id)
  const { data: msgs } = idsChamados.length
    ? await supabase
        .from('suporte_mensagens')
        .select('conversa_id, autor, texto, criado_em')
        .in('conversa_id', idsChamados)
        .order('criado_em', { ascending: true })
    : { data: [] as { conversa_id: string; autor: string; texto: string; criado_em: string }[] }
  const msgsPorConversa = new Map<string, { autor: string; texto: string }[]>()
  for (const m of msgs ?? []) {
    const lista = msgsPorConversa.get(m.conversa_id) ?? []
    lista.push({ autor: m.autor, texto: m.texto })
    msgsPorConversa.set(m.conversa_id, lista)
  }

  const categorias = Array.from(new Set((faq ?? []).map((f) => f.categoria)))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Suporte"
        title="Central de ajuda"
        description="Tire dúvidas com o assistente, consulte as perguntas frequentes e acompanhe os chamados do seu escritório."
      />
      {searchParams?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {searchParams.error}
        </p>
      )}
      {searchParams?.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          {searchParams.ok}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <SectionTitle>Perguntas frequentes</SectionTitle>
          {(faq ?? []).length === 0 ? (
            <EmptyState>A base de perguntas ainda está sendo montada.</EmptyState>
          ) : (
            categorias.map((cat) => (
              <Card key={cat} className="p-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-deep">{cat}</h3>
                <div className="divide-y divide-line">
                  {(faq ?? [])
                    .filter((f) => f.categoria === cat)
                    .map((f) => (
                      <details key={f.id} className="group py-2">
                        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-ink">
                          {f.pergunta}
                          <span className="text-ink-soft transition group-open:rotate-90">›</span>
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{f.resposta}</p>
                      </details>
                    ))}
                </div>
              </Card>
            ))
          )}

          <SectionTitle>Meus chamados</SectionTitle>
          {(chamados ?? []).length === 0 ? (
            <EmptyState>
              Nenhum chamado aberto. Quando o assistente encaminhar algo à equipe, aparece aqui.
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {(chamados ?? []).map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{c.assunto}</p>
                    <Pill>{STATUS_LABEL[c.status] ?? c.status}</Pill>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-soft">Atualizado em {dataBr(c.atualizado_em)}</p>
                  <div className="mt-2 space-y-1.5">
                    {(msgsPorConversa.get(c.id) ?? []).slice(-3).map((m, i) => (
                      <p key={i} className="text-xs text-ink-muted">
                        <span className="font-semibold text-ink">
                          {m.autor === 'usuario' ? 'Você' : m.autor === 'ia' ? 'Assistente' : 'Equipe Quotaria'}:
                        </span>{' '}
                        {m.texto.length > 160 ? m.texto.slice(0, 160) + '…' : m.texto}
                      </p>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SectionTitle>Fale com o assistente</SectionTitle>
          <ChatSuporte />
          <Card className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-ink">Tem uma sugestão?</p>
              <p className="text-xs text-ink-muted">Seu feedback chega direto para quem constrói o Quotaria.</p>
            </div>
            <EditDialog title="Enviar feedback" label="Enviar feedback">
              <form className="space-y-3 p-5">
                <div>
                  <Label htmlFor="fb-texto">O que podemos melhorar?</Label>
                  <textarea id="fb-texto" name="texto" rows={5} className={fieldClass} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                    <MessageSquareText size={12} /> Lido pela equipe, sem resposta automática.
                  </span>
                  <SubmitButton action={enviarFeedback}>Enviar</SubmitButton>
                </div>
              </form>
            </EditDialog>
          </Card>
        </div>
      </div>
    </div>
  )
}
