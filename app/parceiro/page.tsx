import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sairParceiro, advogadoCriarClausula, advogadoExcluirClausula } from './actions'
import { PendingButton, SubmitButton } from '@/components/submit-button'
import { fieldClass } from '@/components/ui'
import { LABEL_TIPO_DIREITO, formatarMoeda } from '@/lib/format'

export const dynamic = 'force-dynamic'

const LABEL_CLAUSULA: Record<string, string> = {
  incomunicabilidade: 'Incomunicabilidade',
  impenhorabilidade: 'Impenhorabilidade',
  inalienabilidade: 'Inalienabilidade',
  reversao: 'Reversão',
  usufruto_vitalicio: 'Usufruto vitalício',
  outra: 'Outra',
}

export default async function Parceiro({ searchParams }: { searchParams: { fam?: string; error?: string; message?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: acessos } = await supabase
    .from('advogado_access')
    .select('family_id, nivel, organization_id')
    .not('aceito_em', 'is', null)
  if (!acessos || acessos.length === 0) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-bold text-ink">Sem acesso ativo</h1>
          <p className="mt-2 text-sm text-ink-muted">Nenhuma família compartilhada com você ainda. Se recebeu um convite, abra o link novamente.</p>
          <form className="mt-4"><PendingButton action={sairParceiro} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface">Sair</PendingButton></form>
        </div>
      </main>
    )
  }

  const sel = searchParams.fam && acessos.some((a) => a.family_id === searchParams.fam) ? searchParams.fam : acessos[0].family_id
  const acessoSel = acessos.find((a) => a.family_id === sel)!
  const contribui = acessoSel.nivel === 'contribuicao'

  // nomes das famílias para o seletor
  const { data: familias } = await supabase.from('families').select('id, name').in('id', acessos.map((a) => a.family_id))
  const nomeFam = new Map((familias ?? []).map((f) => [f.id, f.name]))
  const { data: org } = await supabase.from('organizations').select('nome').eq('id', acessoSel.organization_id).maybeSingle()

  const { data: holdings } = await supabase.from('holdings').select('id, razao_social, cnpj, tipo_societario').eq('family_id', sel).order('razao_social')
  const holdingIds = (holdings ?? []).map((h) => h.id)
  const nomeHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))
  const { data: socios } = await supabase.from('socios').select('id, nome').eq('family_id', sel)
  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const inH = holdingIds.length ? holdingIds : ['00000000-0000-0000-0000-000000000000']
  const [{ data: quotas }, { data: bens }, { data: clausulas }, { data: docs }] = await Promise.all([
    supabase.from('quotas').select('holding_id, socio_id, percentual, tipo_direito').in('holding_id', inH),
    supabase.from('bens').select('holding_id, descricao, valor_mercado').in('holding_id', inH),
    supabase.from('clausulas').select('id, holding_id, tipo, descricao, responsavel').in('holding_id', inH),
    supabase.from('documentos').select('holding_id, nome, tipo').in('holding_id', inH),
  ])

  return (
    <div className="min-h-[100dvh] bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-bold text-navy">Área do advogado</p>
            <p className="text-xs text-ink-soft">{org?.nome ?? 'Escritório parceiro'}</p>
          </div>
          <form><PendingButton action={sairParceiro} className="text-xs font-medium text-ink-soft transition hover:text-ink">Sair</PendingButton></form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {/* seletor de família */}
        {acessos.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {acessos.map((a) => (
              <a key={a.family_id} href={`/parceiro?fam=${a.family_id}`}
                 className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${a.family_id === sel ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-muted'}`}>
                {nomeFam.get(a.family_id) ?? 'Família'}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-ink">{nomeFam.get(sel)}</h1>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${contribui ? 'bg-gold/20 text-gold-deep' : 'bg-line text-ink-muted'}`}>
            {contribui ? 'contribuição' : 'leitura'}
          </span>
        </div>

        {searchParams?.error && <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
        {searchParams?.message && <p className="mt-3 text-sm font-medium text-emerald-600">{searchParams.message}</p>}

        {/* estrutura */}
        <div className="mt-5 space-y-4">
          {(holdings ?? []).map((h) => (
            <div key={h.id} className="rounded-xl2 border border-line bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold text-ink">{h.razao_social}</h3>
                <span className="text-xs text-ink-soft">{h.cnpj ?? h.tipo_societario?.toUpperCase()}</span>
              </div>
              {(quotas ?? []).filter((q) => q.holding_id === h.id).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {(quotas ?? []).filter((q) => q.holding_id === h.id).map((q, i) => (
                    <li key={i} className="flex justify-between"><span>{nomeSocio.get(q.socio_id ?? '') ?? 'sócio'}</span><span className="text-ink-muted">{q.percentual}% · {LABEL_TIPO_DIREITO[q.tipo_direito]}</span></li>
                  ))}
                </ul>
              )}
              {(bens ?? []).filter((b) => b.holding_id === h.id).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {(bens ?? []).filter((b) => b.holding_id === h.id).map((b, i) => (
                    <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate">{b.descricao}</span><span className="shrink-0 text-ink-muted">{b.valor_mercado ? formatarMoeda(Number(b.valor_mercado)) : ''}</span></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* cláusulas */}
        <h2 className="mt-8 text-sm font-bold text-ink">Cláusulas de proteção</h2>
        <div className="mt-3 rounded-xl2 border border-line bg-white p-5">
          {(clausulas ?? []).length === 0 ? (
            <p className="text-sm text-ink-soft">Nenhuma cláusula registrada.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(clausulas ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span className="text-ink">{LABEL_CLAUSULA[c.tipo] ?? c.tipo}{c.descricao ? ` — ${c.descricao}` : ''} <span className="text-ink-soft">({nomeHolding.get(c.holding_id ?? '')})</span></span>
                  {contribui && (
                    <form>
                      <input type="hidden" name="id" value={c.id} />
                      <PendingButton action={advogadoExcluirClausula} className="text-xs text-ink-soft transition hover:text-red-600">remover</PendingButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {contribui && (holdings ?? []).length > 0 && (
            <form className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-deep">Registrar cláusula</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="holding_id" className={fieldClass} defaultValue={holdingIds[0]}>
                  {(holdings ?? []).map((h) => <option key={h.id} value={h.id}>{h.razao_social}</option>)}
                </select>
                <select name="tipo" className={fieldClass} defaultValue="incomunicabilidade">
                  {Object.entries(LABEL_CLAUSULA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input name="descricao" placeholder="Descrição (opcional)" className={`${fieldClass} sm:col-span-2`} />
                <input name="responsavel" placeholder="Responsável (advogado)" className={`${fieldClass} sm:col-span-2`} />
              </div>
              <div className="mt-3"><SubmitButton action={advogadoCriarClausula}>Registrar cláusula</SubmitButton></div>
            </form>
          )}
        </div>

        {/* documentos */}
        {(docs ?? []).length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-bold text-ink">Documentos no cofre</h2>
            <div className="mt-3 rounded-xl2 border border-line bg-white p-5">
              <ul className="space-y-2 text-sm">
                {(docs ?? []).map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3"><span className="min-w-0 truncate text-ink">{d.nome}</span><span className="shrink-0 text-xs text-ink-soft">{d.tipo?.replaceAll('_', ' ')}</span></li>
                ))}
              </ul>
            </div>
          </>
        )}

        <p className="mt-10 text-center text-[11px] text-ink-soft">
          Você registra e interpreta os instrumentos jurídicos; a escrituração e os cálculos ficam com o contador da família.
        </p>
      </main>
    </div>
  )
}
