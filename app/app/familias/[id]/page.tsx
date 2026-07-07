import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  formatarData,
  LABEL_TIPO_SOCIETARIO,
  LABEL_STATUS_HOLDING,
  LABEL_PAPEL_FAMILIAR,
  LABEL_ESTADO_CIVIL,
  LABEL_REGIME_BENS,
} from '@/lib/format'
import { createHolding, createSocio, deleteHolding, deleteSocio, updateFamily, updateSocio } from '../../actions'
import { PageHeader, Card, ListCard, EmptyState, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { EditDialog } from '@/components/edit-dialog'

export default async function FamilyDetail({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: family } = await supabase
    .from('families').select('id, name, notes, created_at').eq('id', params.id).single()
  if (!family) notFound()

  const { data: socios } = await supabase
    .from('socios').select('id, nome, papel_familiar, regime_bens, cpf, estado_civil')
    .eq('family_id', params.id).order('nome')

  const { data: holdings } = await supabase
    .from('holdings').select('id, razao_social, cnpj, tipo_societario, status, created_at')
    .eq('family_id', params.id).order('razao_social')

  return (
    <div>
      <PageHeader
        back={{ href: '/app', label: 'Famílias' }}
        title={family.name}
        description={`Cadastrada em ${formatarData(family.created_at)}`}
        action={
          <EditDialog title="Editar família">
            <form className="space-y-4">
              <input type="hidden" name="id" value={family.id} />
              <div>
                <Label htmlFor="edit_name">Nome</Label>
                <input id="edit_name" name="name" defaultValue={family.name} required className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="edit_notes">Observações</Label>
                <textarea id="edit_notes" name="notes" defaultValue={family.notes ?? ''} rows={3} className={fieldClass} />
              </div>
              <div className="flex justify-end">
                <SubmitButton action={updateFamily}>Salvar</SubmitButton>
              </div>
            </form>
          </EditDialog>
        }
      />

      {searchParams?.error && <p className="mb-6 text-sm font-medium text-red-600">{searchParams.error}</p>}

      {/* SÓCIOS */}
      <SectionTitle>Sócios</SectionTitle>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="family_id" value={family.id} />
          <div>
            <Label htmlFor="nome">Nome</Label>
            <input id="nome" name="nome" required placeholder="Ex.: Roberto Andrade" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <input id="cpf" name="cpf" placeholder="000.000.000-00" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="papel_familiar">Papel na família</Label>
            <select id="papel_familiar" name="papel_familiar" className={fieldClass}>
              <option value="">—</option>
              {Object.entries(LABEL_PAPEL_FAMILIAR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="regime_bens">Regime de bens</Label>
            <select id="regime_bens" name="regime_bens" className={fieldClass}>
              <option value="">—</option>
              {Object.entries(LABEL_REGIME_BENS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton action={createSocio}>Adicionar sócio</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-4">
        {!socios || socios.length === 0 ? (
          <EmptyState>Nenhum sócio cadastrado ainda.</EmptyState>
        ) : (
          <ListCard>
            {socios.map((so) => (
              <div key={so.id} className="flex items-center gap-2 px-5 py-3">
                <span className="flex-1 font-medium text-ink">{so.nome}</span>
                <span className="flex items-center gap-2 text-xs text-ink-muted">
                  {so.papel_familiar && <Pill>{LABEL_PAPEL_FAMILIAR[so.papel_familiar]}</Pill>}
                  {so.regime_bens ? LABEL_REGIME_BENS[so.regime_bens] : ''}
                </span>
                <EditDialog title="Editar sócio" compact>
                  <form className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={so.id} />
                    <input type="hidden" name="family_id" value={family.id} />
                    <div>
                      <Label htmlFor={`es_nome_${so.id}`}>Nome</Label>
                      <input id={`es_nome_${so.id}`} name="nome" defaultValue={so.nome} required className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`es_cpf_${so.id}`}>CPF</Label>
                      <input id={`es_cpf_${so.id}`} name="cpf" defaultValue={so.cpf ?? ''} className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`es_papel_${so.id}`}>Papel na família</Label>
                      <select id={`es_papel_${so.id}`} name="papel_familiar" defaultValue={so.papel_familiar ?? ''} className={fieldClass}>
                        <option value="">—</option>
                        {Object.entries(LABEL_PAPEL_FAMILIAR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`es_civil_${so.id}`}>Estado civil</Label>
                      <select id={`es_civil_${so.id}`} name="estado_civil" defaultValue={so.estado_civil ?? ''} className={fieldClass}>
                        <option value="">—</option>
                        {Object.entries(LABEL_ESTADO_CIVIL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`es_regime_${so.id}`}>Regime de bens</Label>
                      <select id={`es_regime_${so.id}`} name="regime_bens" defaultValue={so.regime_bens ?? ''} className={fieldClass}>
                        <option value="">—</option>
                        {Object.entries(LABEL_REGIME_BENS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end sm:col-span-2">
                      <SubmitButton action={updateSocio}>Salvar</SubmitButton>
                    </div>
                  </form>
                </EditDialog>
                <DeleteButton action={deleteSocio} id={so.id} label={`o sócio "${so.nome}"`} extra={{ family_id: family.id }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* HOLDINGS */}
      <div className="mt-10"><SectionTitle>Holdings</SectionTitle></div>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <input type="hidden" name="family_id" value={family.id} />
          <div>
            <Label htmlFor="razao_social">Razão social</Label>
            <input id="razao_social" name="razao_social" required placeholder="Ex.: Andrade Participações Ltda" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="tipo_societario">Tipo</Label>
            <select id="tipo_societario" name="tipo_societario" className={fieldClass}>
              <option value="ltda">Ltda</option>
              <option value="sa">S/A</option>
            </select>
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" className={fieldClass} />
          </div>
          <div className="sm:col-span-3">
            <SubmitButton action={createHolding}>Adicionar holding</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-4">
        {!holdings || holdings.length === 0 ? (
          <EmptyState>Nenhuma holding nesta família ainda.</EmptyState>
        ) : (
          <ListCard>
            {holdings.map((h) => (
              <div key={h.id} className="flex items-center gap-2 px-5 py-4 transition hover:bg-surface">
                <Link href={`/app/holdings/${h.id}`} className="flex flex-1 items-center justify-between">
                  <span>
                    <span className="font-semibold text-ink">{h.razao_social}</span>
                    <span className="ml-2 text-xs text-ink-soft">
                      {LABEL_TIPO_SOCIETARIO[h.tipo_societario]}{h.cnpj ? ` · ${h.cnpj}` : ''}
                    </span>
                  </span>
                  <span className="mr-3 flex items-center gap-3 text-xs text-ink-soft">
                    {LABEL_STATUS_HOLDING[h.status]}
                    <ChevronRight size={16} />
                  </span>
                </Link>
                <DeleteButton action={deleteHolding} id={h.id} label={`a holding "${h.razao_social}" e seus dados`} extra={{ family_id: family.id }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>
    </div>
  )
}
