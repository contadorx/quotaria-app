import { Lock, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, EmptyState, PageHeader, Pill, SubmitButton, fieldClass, Label } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { PendingButton } from '@/components/submit-button'
import { salvarFaq, excluirFaq } from '@/app/app/admin/suporte-actions'

export const dynamic = 'force-dynamic'

type Faq = {
  id: string
  categoria: string
  pergunta: string
  resposta: string
  destaque: boolean
  publicado: boolean
  ordem: number
  video_url?: string | null
}

function FormFaq({ item }: { item?: Faq }) {
  const uid = item?.id ?? 'novo'
  return (
    <form className="space-y-3 p-5">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`cat-${uid}`}>Categoria</Label>
          <input id={`cat-${uid}`} name="categoria" type="text" defaultValue={item?.categoria ?? 'Geral'} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`ord-${uid}`}>Ordem</Label>
          <input id={`ord-${uid}`} name="ordem" type="number" defaultValue={item?.ordem ?? 0} className={fieldClass} />
        </div>
      </div>
      <div>
        <Label htmlFor={`per-${uid}`}>Pergunta</Label>
        <input id={`per-${uid}`} name="pergunta" type="text" defaultValue={item?.pergunta ?? ''} className={fieldClass} />
      </div>
      <div>
        <Label htmlFor={`res-${uid}`}>Resposta</Label>
        <textarea id={`res-${uid}`} name="resposta" rows={5} defaultValue={item?.resposta ?? ''} className={fieldClass} />
      </div>
      <div>
        <Label htmlFor={`vid-${uid}`}>Vídeo (YouTube/Vimeo — opcional)</Label>
        <input id={`vid-${uid}`} name="video_url" type="url" placeholder="https://youtu.be/…" defaultValue={item?.video_url ?? ''} className={fieldClass} />
      </div>
      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="publicado" defaultChecked={item?.publicado ?? true} className="h-4 w-4 rounded border-line" />
          Publicado
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="destaque" defaultChecked={item?.destaque ?? false} className="h-4 w-4 rounded border-line" />
          Destaque
        </label>
      </div>
      <div className="flex justify-end">
        <SubmitButton action={salvarFaq}>Salvar</SubmitButton>
      </div>
    </form>
  )
}

export default async function AdminAjudaPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data: isAdmin } = await supabase.rpc('is_super_admin')

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio edita a base.</p>
        </Card>
      </div>
    )
  }

  const { data: faq } = await supabase
    .from('faq')
    .select('id, categoria, pergunta, resposta, destaque, publicado, ordem, video_url')
    .order('categoria', { ascending: true })
    .order('ordem', { ascending: true })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negócio"
        title="Base de conhecimento"
        description="As perguntas e respostas que alimentam a Central de Ajuda e o assistente de IA. Escreva como você explicaria numa call."
        back={{ href: '/app/admin', label: 'Painel do negócio' }}
        action={
          <EditDialog title="Nova pergunta" label="Nova pergunta">
            <FormFaq />
          </EditDialog>
        }
      />
      {searchParams?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {searchParams.error}
        </p>
      )}

      {(faq ?? []).length === 0 ? (
        <EmptyState>Nenhuma pergunta ainda — a base vazia deixa o assistente sem fonte.</EmptyState>
      ) : (
        <div className="space-y-2">
          {(faq ?? []).map((f) => (
            <Card key={f.id} className={`flex items-start justify-between gap-3 p-4 ${f.publicado ? '' : 'opacity-50'}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Pill>{f.categoria}</Pill>
                  {f.destaque && <Pill>Destaque</Pill>}
                  {!f.publicado && <Pill>Rascunho</Pill>}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink">{f.pergunta}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{f.resposta}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <EditDialog title={`Editar — ${f.pergunta.slice(0, 40)}`} compact>
                  <FormFaq item={f as Faq} />
                </EditDialog>
                <form>
                  <input type="hidden" name="id" value={f.id} />
                  <PendingButton
                    action={excluirFaq}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </PendingButton>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
