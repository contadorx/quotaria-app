import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, Pill, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { DeleteButton } from '@/components/delete-button'
import { formatarMoeda } from '@/lib/format'
import { salvarCupom, excluirCupom } from '../cupons-actions'

export const dynamic = 'force-dynamic'

type Cupom = {
  id: string; codigo: string; tipo: string; valor: number; duracao_meses: number | null
  validade: string | null; limite_usos: number | null; usos: number; ativo: boolean; observacoes: string | null
}

function desconto(c: { tipo: string; valor: number }) {
  return c.tipo === 'percentual' ? `${c.valor}%` : formatarMoeda(c.valor)
}
function duracaoTxt(m: number | null) {
  return m == null ? 'para sempre' : `${m} ${m === 1 ? 'mês' : 'meses'}`
}

function FormCupom({ item }: { item?: Cupom }) {
  const uid = item?.id ?? 'novo'
  return (
    <form className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`cod-${uid}`}>Código</Label>
          <input id={`cod-${uid}`} name="codigo" defaultValue={item?.codigo ?? ''} placeholder="FUNDADOR6" className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`tipo-${uid}`}>Tipo</Label>
          <select id={`tipo-${uid}`} name="tipo" defaultValue={item?.tipo ?? 'percentual'} className={fieldClass}>
            <option value="percentual">Percentual (%)</option>
            <option value="valor">Valor fixo (R$)</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`val-${uid}`}>Valor do desconto (% ou R$)</Label>
          <input id={`val-${uid}`} name="valor" type="number" step="0.01" min="0" defaultValue={item?.valor ?? ''} placeholder="20" className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`dur-${uid}`}>Duração em meses (vazio = para sempre)</Label>
          <input id={`dur-${uid}`} name="duracao_meses" type="number" min="1" defaultValue={item?.duracao_meses ?? ''} placeholder="6" className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`vld-${uid}`}>Válido até (opcional)</Label>
          <input id={`vld-${uid}`} name="validade" type="date" defaultValue={item?.validade ?? ''} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`lim-${uid}`}>Limite de usos (vazio = ilimitado)</Label>
          <input id={`lim-${uid}`} name="limite_usos" type="number" min="1" defaultValue={item?.limite_usos ?? ''} placeholder="100" className={fieldClass} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="ativo" defaultChecked={item?.ativo ?? true} className="h-4 w-4 rounded border-line" /> Ativo
      </label>
      <div>
        <Label htmlFor={`obs-${uid}`}>Observações</Label>
        <textarea id={`obs-${uid}`} name="observacoes" rows={2} defaultValue={item?.observacoes ?? ''} className={fieldClass} />
      </div>
      <SubmitButton action={salvarCupom}>Salvar</SubmitButton>
    </form>
  )
}

export default async function AdminCuponsPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const supabase = createClient()
  const { data: ehAdmin } = await supabase.rpc('is_super_admin')
  if (!ehAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio gerencia os cupons.</p>
        </Card>
      </div>
    )
  }
  const { data: cupons } = await supabase.from('cupons').select('*').order('created_at', { ascending: false })

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negócio" title="Cupons de desconto" />
      <p className="-mt-2 text-sm text-ink-muted">
        O cliente digita o código no checkout. O desconto vale pela duração definida (ex.: 6 meses) e depois a fatura
        volta ao valor cheio; sem duração, o desconto é permanente. Aplica-se ao <strong>plano mensal</strong>.
      </p>

      {searchParams?.message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{searchParams.message}</p>}
      {searchParams?.error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{searchParams.error}</p>}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">Novo cupom</h2>
        <FormCupom />
      </Card>

      {!cupons || cupons.length === 0 ? (
        <EmptyState>Nenhum cupom cadastrado ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-line">
            {(cupons as Cupom[]).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="font-mono font-bold text-navy">{c.codigo}</span>
                <Pill>{desconto(c)} · {duracaoTxt(c.duracao_meses)}</Pill>
                {!c.ativo && <Pill>inativo</Pill>}
                <span className="text-xs text-ink-soft">
                  {c.usos} uso{c.usos === 1 ? '' : 's'}{c.limite_usos ? ` / ${c.limite_usos}` : ''}
                  {c.validade ? ` · até ${c.validade.split('-').reverse().join('/')}` : ''}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <EditDialog title={`Editar ${c.codigo}`} label="Editar"><FormCupom item={c} /></EditDialog>
                  <DeleteButton action={excluirCupom} id={c.id} label={`o cupom ${c.codigo}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
