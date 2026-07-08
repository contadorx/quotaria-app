import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, Pill, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { DeleteButton } from '@/components/delete-button'
import { salvarParceiro, excluirParceiro } from '../parceiros-actions'

export const dynamic = 'force-dynamic'

type Parceiro = {
  id: string; ref: string; nome: string; email: string | null
  documento: string | null; chave_pix: string | null; ativo: boolean; observacoes: string | null
}

function FormParceiro({ item }: { item?: Parceiro }) {
  const uid = item?.id ?? 'novo'
  return (
    <form className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`ref-${uid}`}>Código (ref) — usado no link ?ref=</Label>
          <input id={`ref-${uid}`} name="ref" defaultValue={item?.ref ?? ''} placeholder="ex.: joao" className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`nome-${uid}`}>Nome do parceiro</Label>
          <input id={`nome-${uid}`} name="nome" defaultValue={item?.nome ?? ''} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`email-${uid}`}>E-mail</Label>
          <input id={`email-${uid}`} name="email" type="email" defaultValue={item?.email ?? ''} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`doc-${uid}`}>CPF/CNPJ (para a NF)</Label>
          <input id={`doc-${uid}`} name="documento" defaultValue={item?.documento ?? ''} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`pix-${uid}`}>Chave PIX</Label>
          <input id={`pix-${uid}`} name="chave_pix" defaultValue={item?.chave_pix ?? ''} className={fieldClass} />
        </div>
        <label className="flex items-center gap-2 self-end text-sm text-ink">
          <input type="checkbox" name="ativo" defaultChecked={item?.ativo ?? true} className="h-4 w-4 rounded border-line" /> Ativo
        </label>
      </div>
      <div>
        <Label htmlFor={`obs-${uid}`}>Observações</Label>
        <textarea id={`obs-${uid}`} name="observacoes" rows={2} defaultValue={item?.observacoes ?? ''} className={fieldClass} />
      </div>
      <SubmitButton action={salvarParceiro}>Salvar</SubmitButton>
    </form>
  )
}

export default async function AdminParceirosPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const supabase = createClient()
  const { data: ehAdmin } = await supabase.rpc('is_super_admin')
  if (!ehAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio gerencia os parceiros.</p>
        </Card>
      </div>
    )
  }
  const { data: parceiros } = await supabase
    .from('parceiros').select('id, ref, nome, email, documento, chave_pix, ativo, observacoes').order('nome')

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negócio" title="Parceiros" />
      <p className="-mt-2 text-sm text-ink-muted">
        Cada parceiro tem um <strong>código (ref)</strong> que ele usa no link de divulgação (<code>quotaria.com.br/?ref=CODIGO</code>).
        Quem se cadastra por esse link fica vinculado a ele — e a comissão aparece em <strong>Comissões</strong> com o nome daqui.
      </p>

      {searchParams?.message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{searchParams.message}</p>}
      {searchParams?.error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{searchParams.error}</p>}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">Novo parceiro</h2>
        <FormParceiro />
      </Card>

      {!parceiros || parceiros.length === 0 ? (
        <EmptyState>Nenhum parceiro cadastrado ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-line">
            {parceiros.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="min-w-[9rem] flex-1 font-semibold text-ink">{p.nome}</span>
                <span className="font-mono text-xs text-ink-soft">?ref={p.ref}</span>
                {!p.ativo && <Pill>inativo</Pill>}
                <span className="hidden text-xs text-ink-muted sm:inline">{p.email ?? 'sem e-mail'}</span>
                <EditDialog title={`Editar ${p.nome}`} label="Editar"><FormParceiro item={p} /></EditDialog>
                <DeleteButton action={excluirParceiro} id={p.id} label={`o parceiro ${p.nome}`} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
