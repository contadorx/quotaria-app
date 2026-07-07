import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, AlertTriangle, FileText, FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  formatarData,
  formatarMoeda,
  LABEL_TIPO_SOCIETARIO,
  LABEL_STATUS_HOLDING,
  LABEL_TIPO_DIREITO,
  LABEL_CLASSE_QUOTA,
  LABEL_TIPO_BEM,
  LABEL_TIPO_CLAUSULA,
} from '@/lib/format'
import {
  createQuota, createBem, createClausula,
  deleteQuota, deleteBem, deleteClausula,
  updateHolding, updateQuota, updateBem, updateClausula,
  salvarConformidade,
} from '../../actions'
import { PageHeader, Card, ListCard, EmptyState, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { EditDialog } from '@/components/edit-dialog'

const CONF_ITENS = [
  { campo: 'nfse_cbs', label: 'NFS-e emitida com destaque de CBS', hint: 'obrigatório desde 01/08/2026' },
  { campo: 'clausula_repasse', label: 'Contratos com cláusula de repasse de IBS/CBS', hint: '' },
  { campo: 'credito_locatario', label: 'Crédito do locatário PJ mapeado', hint: '' },
  { campo: 'redutor_social', label: 'Redutor social aplicado', hint: 'R$ 600/mês por unidade residencial' },
  { campo: 'regime_caixa', label: 'Regime de caixa configurado', hint: '' },
]


export default async function HoldingDetail({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const supabase = createClient()

  const { data: holding } = await supabase.from('holdings').select('*').eq('id', params.id).single()
  if (!holding) notFound()

  const { data: family } = await supabase.from('families').select('id, name').eq('id', holding.family_id).single()
  const { data: socios } = await supabase.from('socios').select('id, nome').eq('family_id', holding.family_id).order('nome')
  const { data: quotas } = await supabase
    .from('quotas').select('id, socio_id, quantidade, percentual, tipo_direito, classe')
    .eq('holding_id', params.id).order('created_at')
  const { data: bens } = await supabase
    .from('bens').select('id, tipo, descricao, valor_contabil, municipio_uf, data_aquisicao, gera_receita')
    .eq('holding_id', params.id).order('descricao')
  const { data: clausulas } = await supabase
    .from('clausulas').select('id, tipo, holding_id, quota_id, bem_id, descricao, registrada_em, responsavel')
    .eq('accountant_id', holding.accountant_id).order('created_at')
  const { data: conformidade } = await supabase
    .from('conformidade_reforma')
    .select('nfse_cbs, clausula_repasse, credito_locatario, redutor_social, regime_caixa, notes')
    .eq('holding_id', params.id).maybeSingle()

  const temReceita = (bens ?? []).some((b) => b.gera_receita)

  const nomePorSocio = new Map((socios ?? []).map((so) => [so.id, so.nome]))
  const temSocios = (socios ?? []).length > 0
  const holdingId = holding.id

  const quotaLabel = new Map(
    (quotas ?? []).map((q) => [q.id, `Quota de ${nomePorSocio.get(q.socio_id) ?? 'sócio'} (${LABEL_TIPO_DIREITO[q.tipo_direito]})`]),
  )
  const bemLabel = new Map((bens ?? []).map((b) => [b.id, b.descricao]))
  function escopoLabel(c: { holding_id: string | null; quota_id: string | null; bem_id: string | null }): string {
    if (c.holding_id) return 'Holding (toda)'
    if (c.quota_id) return quotaLabel.get(c.quota_id) ?? 'Quota'
    if (c.bem_id) return bemLabel.get(c.bem_id) ?? 'Bem'
    return '—'
  }
  const idsQuotas = new Set((quotas ?? []).map((q) => q.id))
  const idsBens = new Set((bens ?? []).map((b) => b.id))
  const clausulasDaHolding = (clausulas ?? []).filter(
    (c) => c.holding_id === holdingId || (c.quota_id && idsQuotas.has(c.quota_id)) || (c.bem_id && idsBens.has(c.bem_id)),
  )

  return (
    <div>
      <PageHeader
        back={{ href: family ? `/app/familias/${family.id}` : '/app', label: family?.name ?? 'Famílias' }}
        title={holding.razao_social}
        action={
          <div className="flex items-center gap-2">
          <Link
            href={`/app/holdings/${holdingId}/relatorio`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft"
          >
            <FileText size={15} /> Relatório anual
          </Link>
          <Link
            href={`/app/holdings/${holdingId}/minutas`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
          >
            <FileSignature size={15} /> Minutas
          </Link>
          <EditDialog title="Editar holding">
            <form className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={holdingId} />
              <div className="sm:col-span-2">
                <Label htmlFor="edit_razao">Razão social</Label>
                <input id="edit_razao" name="razao_social" defaultValue={holding.razao_social} required className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="edit_fantasia">Nome fantasia</Label>
                <input id="edit_fantasia" name="nome_fantasia" defaultValue={holding.nome_fantasia ?? ''} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="edit_cnpj">CNPJ</Label>
                <input id="edit_cnpj" name="cnpj" defaultValue={holding.cnpj ?? ''} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="edit_tipo">Tipo</Label>
                <select id="edit_tipo" name="tipo_societario" defaultValue={holding.tipo_societario} className={fieldClass}>
                  {Object.entries(LABEL_TIPO_SOCIETARIO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <select id="edit_status" name="status" defaultValue={holding.status} className={fieldClass}>
                  {Object.entries(LABEL_STATUS_HOLDING).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="edit_data">Constituição</Label>
                <input id="edit_data" name="data_constituicao" type="date" defaultValue={holding.data_constituicao ?? ''} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="edit_capital">Capital social</Label>
                <input id="edit_capital" name="capital_social" type="number" step="0.01" min="0" defaultValue={holding.capital_social ?? ''} className={fieldClass} />
              </div>
              <div className="flex justify-end sm:col-span-2">
                <SubmitButton action={updateHolding}>Salvar</SubmitButton>
              </div>
            </form>
          </EditDialog>
          </div>
        }
      />

      <Card className="mb-8 grid grid-cols-2 gap-x-8 gap-y-4 p-5 sm:grid-cols-4">
        <Info label="Tipo" value={LABEL_TIPO_SOCIETARIO[holding.tipo_societario]} />
        <Info label="Status" value={LABEL_STATUS_HOLDING[holding.status]} />
        <Info label="CNPJ" value={holding.cnpj ?? '—'} />
        <Info label="Constituição" value={formatarData(holding.data_constituicao)} />
      </Card>

      {searchParams?.error && <p className="mb-6 text-sm font-medium text-red-600">{searchParams.error}</p>}

      {/* QUOTAS */}
      <SectionTitle>Quotas</SectionTitle>
      <p className="mb-0 mt-1 text-xs text-ink-soft">Usufruto e nua-propriedade sobre a mesma fração entram como duas linhas.</p>
      {!temSocios ? (
        <Card className="mt-3 p-6 text-sm text-ink-muted">
          Cadastre sócios na família antes de atribuir quotas.{' '}
          {family && <Link href={`/app/familias/${family.id}`} className="font-semibold text-navy underline-offset-2 hover:underline">Ir para a família →</Link>}
        </Card>
      ) : (
        <Card className="mt-3 p-5">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="holding_id" value={holdingId} />
            <div className="lg:col-span-2">
              <Label htmlFor="socio_id">Sócio</Label>
              <select id="socio_id" name="socio_id" required className={fieldClass}>
                {(socios ?? []).map((so) => <option key={so.id} value={so.id}>{so.nome}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="quantidade">Quantidade</Label>
              <input id="quantidade" name="quantidade" type="number" step="0.0001" min="0" defaultValue="0" className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="percentual">% (opcional)</Label>
              <input id="percentual" name="percentual" type="number" step="0.0001" min="0" max="100" placeholder="50" className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="tipo_direito">Direito</Label>
              <select id="tipo_direito" name="tipo_direito" className={fieldClass}>
                {Object.entries(LABEL_TIPO_DIREITO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <SubmitButton action={createQuota}>Adicionar quota</SubmitButton>
            </div>
          </form>
        </Card>
      )}
      <div className="mt-4">
        {!quotas || quotas.length === 0 ? (
          <EmptyState>Nenhuma quota lançada ainda.</EmptyState>
        ) : (
          <ListCard>
            {(quotas ?? []).map((q) => (
              <div key={q.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                <span className="flex-1 font-medium text-ink">{nomePorSocio.get(q.socio_id) ?? 'Sócio removido'}</span>
                <span className="flex items-center gap-2 text-ink-muted">
                  <span className="num">{q.quantidade}</span> quotas
                  {q.percentual != null ? <> · <span className="num">{q.percentual}%</span></> : null}
                  <Pill>{LABEL_TIPO_DIREITO[q.tipo_direito]}</Pill>
                </span>
                <EditDialog title="Editar quota" compact>
                  <form className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="holding_id" value={holdingId} />
                    <div className="sm:col-span-2">
                      <Label htmlFor={`eq_socio_${q.id}`}>Sócio</Label>
                      <select id={`eq_socio_${q.id}`} name="socio_id" defaultValue={q.socio_id} className={fieldClass}>
                        {(socios ?? []).map((so) => <option key={so.id} value={so.id}>{so.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`eq_qtd_${q.id}`}>Quantidade</Label>
                      <input id={`eq_qtd_${q.id}`} name="quantidade" type="number" step="0.0001" min="0" defaultValue={q.quantidade} className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`eq_pct_${q.id}`}>%</Label>
                      <input id={`eq_pct_${q.id}`} name="percentual" type="number" step="0.0001" min="0" max="100" defaultValue={q.percentual ?? ''} className={fieldClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`eq_dir_${q.id}`}>Direito</Label>
                      <select id={`eq_dir_${q.id}`} name="tipo_direito" defaultValue={q.tipo_direito} className={fieldClass}>
                        {Object.entries(LABEL_TIPO_DIREITO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end sm:col-span-2"><SubmitButton action={updateQuota}>Salvar</SubmitButton></div>
                  </form>
                </EditDialog>
                <DeleteButton action={deleteQuota} id={q.id} label="esta quota" extra={{ holding_id: holdingId }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* BENS */}
      <div className="mt-10"><SectionTitle>Bens</SectionTitle></div>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="holding_id" value={holdingId} />
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <select id="tipo" name="tipo" className={fieldClass}>
              {Object.entries(LABEL_TIPO_BEM).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <input id="descricao" name="descricao" required placeholder="Ex.: Apto 101 - Ed. Central" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="valor_contabil">Valor contábil</Label>
            <input id="valor_contabil" name="valor_contabil" type="number" step="0.01" min="0" placeholder="350000" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="municipio_uf">Município/UF</Label>
            <input id="municipio_uf" name="municipio_uf" placeholder="Santo André/SP" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="data_aquisicao">Aquisição</Label>
            <input id="data_aquisicao" name="data_aquisicao" type="date" className={fieldClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2 lg:col-span-3">
            <input type="checkbox" name="gera_receita" className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
            Gera receita (ex.: imóvel locado — relevante no IVA da Reforma)
          </label>
          <div className="sm:col-span-2 lg:col-span-3"><SubmitButton action={createBem}>Adicionar bem</SubmitButton></div>
        </form>
      </Card>
      <div className="mt-4">
        {!bens || bens.length === 0 ? (
          <EmptyState>Nenhum bem cadastrado ainda.</EmptyState>
        ) : (
          <ListCard>
            {(bens ?? []).map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                <span className="flex-1">
                  <span className="font-medium text-ink">{b.descricao}</span>
                  <span className="ml-2 text-xs text-ink-soft">
                    {LABEL_TIPO_BEM[b.tipo]}{b.municipio_uf ? ` · ${b.municipio_uf}` : ''}{b.gera_receita ? ' · gera receita' : ''}
                  </span>
                </span>
                <span className="num text-ink-muted">{formatarMoeda(b.valor_contabil)}</span>
                <EditDialog title="Editar bem" compact>
                  <form className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="holding_id" value={holdingId} />
                    <div>
                      <Label htmlFor={`eb_tipo_${b.id}`}>Tipo</Label>
                      <select id={`eb_tipo_${b.id}`} name="tipo" defaultValue={b.tipo} className={fieldClass}>
                        {Object.entries(LABEL_TIPO_BEM).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`eb_val_${b.id}`}>Valor contábil</Label>
                      <input id={`eb_val_${b.id}`} name="valor_contabil" type="number" step="0.01" min="0" defaultValue={b.valor_contabil ?? ''} className={fieldClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`eb_desc_${b.id}`}>Descrição</Label>
                      <input id={`eb_desc_${b.id}`} name="descricao" defaultValue={b.descricao} required className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`eb_mun_${b.id}`}>Município/UF</Label>
                      <input id={`eb_mun_${b.id}`} name="municipio_uf" defaultValue={b.municipio_uf ?? ''} className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`eb_aq_${b.id}`}>Aquisição</Label>
                      <input id={`eb_aq_${b.id}`} name="data_aquisicao" type="date" defaultValue={b.data_aquisicao ?? ''} className={fieldClass} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2">
                      <input type="checkbox" name="gera_receita" defaultChecked={b.gera_receita} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                      Gera receita (imóvel locado)
                    </label>
                    <div className="flex justify-end sm:col-span-2"><SubmitButton action={updateBem}>Salvar</SubmitButton></div>
                  </form>
                </EditDialog>
                <DeleteButton action={deleteBem} id={b.id} label={`o bem "${b.descricao}"`} extra={{ holding_id: holdingId }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* CONFORMIDADE DA REFORMA (aparece quando a holding gera receita de locação) */}
      {temReceita && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <SectionTitle>Conformidade da Reforma · locação</SectionTitle>
            <EditDialog title="Conformidade da Reforma" label="Atualizar">
              <form className="space-y-3">
                <input type="hidden" name="holding_id" value={holdingId} />
                {CONF_ITENS.map((it) => (
                  <label key={it.campo} className="flex items-start gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      name={it.campo}
                      defaultChecked={conformidade ? (conformidade[it.campo as keyof typeof conformidade] as boolean) : false}
                      className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-gold"
                    />
                    <span>
                      {it.label}
                      {it.hint && <span className="block text-xs text-ink-soft">{it.hint}</span>}
                    </span>
                  </label>
                ))}
                <div>
                  <Label htmlFor="conf_notes">Observação</Label>
                  <textarea id="conf_notes" name="notes" rows={2} defaultValue={conformidade?.notes ?? ''} className={fieldClass} />
                </div>
                <div className="flex justify-end"><SubmitButton action={salvarConformidade}>Salvar</SubmitButton></div>
              </form>
            </EditDialog>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Checklist da transição para holdings que geram receita de locação (M4).</p>
          <Card className="mt-3 p-5">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {CONF_ITENS.map((it) => {
                const ok = conformidade ? (conformidade[it.campo as keyof typeof conformidade] as boolean) : false
                return (
                  <li key={it.campo} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                      {ok ? <Check size={13} /> : <AlertTriangle size={12} />}
                    </span>
                    <span className={ok ? 'text-ink' : 'text-ink-muted'}>{it.label}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}

      {/* CLÁUSULAS */}
      <div className="mt-10"><SectionTitle>Cláusulas</SectionTitle></div>
      <p className="mt-1 text-xs text-ink-soft">Registro do fato — o instrumento é redigido pelo advogado (campo Responsável).</p>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="holding_id" value={holdingId} />
          <div>
            <Label htmlFor="clausula_tipo">Tipo</Label>
            <select id="clausula_tipo" name="tipo" required className={fieldClass}>
              {Object.entries(LABEL_TIPO_CLAUSULA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="escopo">Aplica-se a</Label>
            <select id="escopo" name="escopo" required className={fieldClass}>
              <option value="holding">Holding (toda)</option>
              {(quotas ?? []).length > 0 && (
                <optgroup label="Quotas">
                  {(quotas ?? []).map((q) => <option key={q.id} value={`quota:${q.id}`}>{nomePorSocio.get(q.socio_id) ?? 'sócio'} — {LABEL_TIPO_DIREITO[q.tipo_direito]}</option>)}
                </optgroup>
              )}
              {(bens ?? []).length > 0 && (
                <optgroup label="Bens">
                  {(bens ?? []).map((b) => <option key={b.id} value={`bem:${b.id}`}>{b.descricao}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <Label htmlFor="responsavel">Responsável (advogado)</Label>
            <input id="responsavel" name="responsavel" placeholder="Nome do advogado" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="registrada_em">Averbada em</Label>
            <input id="registrada_em" name="registrada_em" type="date" className={fieldClass} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="clausula_descricao">Observação (opcional)</Label>
            <input id="clausula_descricao" name="descricao" placeholder="Ex.: averbada na constituição" className={fieldClass} />
          </div>
          <div className="sm:col-span-2"><SubmitButton action={createClausula}>Registrar cláusula</SubmitButton></div>
        </form>
      </Card>
      <div className="mt-4">
        {clausulasDaHolding.length === 0 ? (
          <EmptyState>Nenhuma cláusula registrada ainda.</EmptyState>
        ) : (
          <ListCard>
            {clausulasDaHolding.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                <span className="flex flex-1 items-center gap-2">
                  <span className="font-medium text-ink">{LABEL_TIPO_CLAUSULA[c.tipo]}</span>
                  <Pill>{escopoLabel(c)}</Pill>
                </span>
                <span className="text-xs text-ink-soft">{c.responsavel ?? '—'}{c.registrada_em ? ` · ${formatarData(c.registrada_em)}` : ''}</span>
                <EditDialog title="Editar cláusula" compact>
                  <form className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="holding_id" value={holdingId} />
                    <div>
                      <Label htmlFor={`ec_tipo_${c.id}`}>Tipo</Label>
                      <select id={`ec_tipo_${c.id}`} name="tipo" defaultValue={c.tipo} className={fieldClass}>
                        {Object.entries(LABEL_TIPO_CLAUSULA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`ec_resp_${c.id}`}>Responsável (advogado)</Label>
                      <input id={`ec_resp_${c.id}`} name="responsavel" defaultValue={c.responsavel ?? ''} className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`ec_data_${c.id}`}>Averbada em</Label>
                      <input id={`ec_data_${c.id}`} name="registrada_em" type="date" defaultValue={c.registrada_em ?? ''} className={fieldClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`ec_desc_${c.id}`}>Observação</Label>
                      <input id={`ec_desc_${c.id}`} name="descricao" defaultValue={c.descricao ?? ''} className={fieldClass} />
                    </div>
                    <p className="text-xs text-ink-soft sm:col-span-2">O escopo (holding/quota/bem) não é editável — para mudar, exclua e recrie.</p>
                    <div className="flex justify-end sm:col-span-2"><SubmitButton action={updateClausula}>Salvar</SubmitButton></div>
                  </form>
                </EditDialog>
                <DeleteButton action={deleteClausula} id={c.id} label={`a cláusula de ${LABEL_TIPO_CLAUSULA[c.tipo].toLowerCase()}`} extra={{ holding_id: holdingId }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  )
}
