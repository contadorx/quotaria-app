import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { createQuota, createBem, createClausula } from '../../actions'
import { PageHeader, Card, ListCard, EmptyState, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'

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

  const { data: family } = await supabase
    .from('families').select('id, name').eq('id', holding.family_id).single()

  const { data: socios } = await supabase
    .from('socios').select('id, nome').eq('family_id', holding.family_id).order('nome')

  const { data: quotas } = await supabase
    .from('quotas')
    .select('id, socio_id, quantidade, percentual, tipo_direito, classe')
    .eq('holding_id', params.id).order('created_at')

  const { data: bens } = await supabase
    .from('bens')
    .select('id, tipo, descricao, valor_contabil, municipio_uf, gera_receita')
    .eq('holding_id', params.id).order('descricao')

  const { data: clausulas } = await supabase
    .from('clausulas')
    .select('id, tipo, holding_id, quota_id, bem_id, descricao, registrada_em, responsavel')
    .eq('accountant_id', holding.accountant_id).order('created_at')

  const nomePorSocio = new Map((socios ?? []).map((so) => [so.id, so.nome]))
  const temSocios = (socios ?? []).length > 0

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
    (c) => c.holding_id === holding.id || (c.quota_id && idsQuotas.has(c.quota_id)) || (c.bem_id && idsBens.has(c.bem_id)),
  )

  return (
    <div>
      <PageHeader
        back={{ href: family ? `/app/familias/${family.id}` : '/app', label: family?.name ?? 'Famílias' }}
        title={holding.razao_social}
      />

      <Card className="mb-8 grid grid-cols-2 gap-x-8 gap-y-4 p-5 sm:grid-cols-4">
        <Info label="Tipo" value={LABEL_TIPO_SOCIETARIO[holding.tipo_societario]} />
        <Info label="Status" value={LABEL_STATUS_HOLDING[holding.status]} />
        <Info label="CNPJ" value={holding.cnpj ?? '—'} />
        <Info label="Constituição" value={formatarData(holding.data_constituicao)} />
      </Card>

      {searchParams?.error && (
        <p className="mb-6 text-sm font-medium text-red-600">{searchParams.error}</p>
      )}

      {/* QUOTAS */}
      <SectionTitle>Quotas</SectionTitle>
      <p className="mb-0 mt-1 text-xs text-ink-soft">
        Usufruto e nua-propriedade sobre a mesma fração entram como duas linhas.
      </p>
      {!temSocios ? (
        <Card className="mt-3 p-6 text-sm text-ink-muted">
          Cadastre sócios na família antes de atribuir quotas.{' '}
          {family && (
            <Link href={`/app/familias/${family.id}`} className="font-semibold text-navy underline-offset-2 hover:underline">
              Ir para a família →
            </Link>
          )}
        </Card>
      ) : (
        <Card className="mt-3 p-5">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="holding_id" value={holding.id} />
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
              <div key={q.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-ink">{nomePorSocio.get(q.socio_id) ?? 'Sócio removido'}</span>
                <span className="flex items-center gap-2 text-ink-muted">
                  <span className="num">{q.quantidade}</span> quotas
                  {q.percentual != null ? <> · <span className="num">{q.percentual}%</span></> : null}
                  <Pill>{LABEL_TIPO_DIREITO[q.tipo_direito]}</Pill>
                  {q.classe ? LABEL_CLASSE_QUOTA[q.classe] : ''}
                </span>
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* BENS */}
      <div className="mt-10"><SectionTitle>Bens</SectionTitle></div>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="holding_id" value={holding.id} />
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
          <div className="sm:col-span-2 lg:col-span-3">
            <SubmitButton action={createBem}>Adicionar bem</SubmitButton>
          </div>
        </form>
      </Card>
      <div className="mt-4">
        {!bens || bens.length === 0 ? (
          <EmptyState>Nenhum bem cadastrado ainda.</EmptyState>
        ) : (
          <ListCard>
            {(bens ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="font-medium text-ink">{b.descricao}</span>
                  <span className="ml-2 text-xs text-ink-soft">
                    {LABEL_TIPO_BEM[b.tipo]}{b.municipio_uf ? ` · ${b.municipio_uf}` : ''}
                    {b.gera_receita ? ' · gera receita' : ''}
                  </span>
                </span>
                <span className="num text-ink-muted">{formatarMoeda(b.valor_contabil)}</span>
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* CLÁUSULAS */}
      <div className="mt-10"><SectionTitle>Cláusulas</SectionTitle></div>
      <p className="mt-1 text-xs text-ink-soft">
        Registro do fato — o instrumento é redigido pelo advogado (campo Responsável).
      </p>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="holding_id" value={holding.id} />
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
                  {(quotas ?? []).map((q) => (
                    <option key={q.id} value={`quota:${q.id}`}>
                      {nomePorSocio.get(q.socio_id) ?? 'sócio'} — {LABEL_TIPO_DIREITO[q.tipo_direito]}
                    </option>
                  ))}
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
          <div className="sm:col-span-2">
            <SubmitButton action={createClausula}>Registrar cláusula</SubmitButton>
          </div>
        </form>
      </Card>
      <div className="mt-4">
        {clausulasDaHolding.length === 0 ? (
          <EmptyState>Nenhuma cláusula registrada ainda.</EmptyState>
        ) : (
          <ListCard>
            {clausulasDaHolding.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-ink">{LABEL_TIPO_CLAUSULA[c.tipo]}</span>
                  <Pill>{escopoLabel(c)}</Pill>
                </span>
                <span className="text-xs text-ink-soft">
                  {c.responsavel ?? '—'}{c.registrada_em ? ` · ${formatarData(c.registrada_em)}` : ''}
                </span>
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
