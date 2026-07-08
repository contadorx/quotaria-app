/* eslint-disable @next/next/no-img-element */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sairPortal } from './actions'
import { PendingButton } from '@/components/submit-button'
import { LABEL_TIPO_DIREITO, formatarMoeda, formatarData } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function Portal({ searchParams }: { searchParams: { fam?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: acessos } = await supabase
    .from('family_access')
    .select('family_id, organization_id')
    .not('aceito_em', 'is', null)
  if (!acessos || acessos.length === 0) {
    // logado, mas sem acesso de família aceito → não é membro
    return (
      <Vazio />
    )
  }

  const familyId = searchParams.fam && acessos.some((a) => a.family_id === searchParams.fam)
    ? searchParams.fam
    : acessos[0].family_id

  // marca do escritório (white-label)
  const orgId = acessos.find((a) => a.family_id === familyId)?.organization_id
  const { data: org } = orgId
    ? await supabase.from('organizations').select('nome, logo_url, cor_primaria, crc').eq('id', orgId).maybeSingle()
    : { data: null }
  const cor = org?.cor_primaria || '#12284B'

  const { data: family } = await supabase.from('families').select('id, name').eq('id', familyId).single()
  const { data: holdings } = await supabase
    .from('holdings').select('id, razao_social, nome_fantasia, cnpj, tipo_societario').eq('family_id', familyId).order('razao_social')
  const holdingIds = (holdings ?? []).map((h) => h.id)
  const { data: socios } = await supabase.from('socios').select('id, nome, papel_familiar').eq('family_id', familyId)
  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))

  const inHoldings = holdingIds.length > 0 ? holdingIds : ['00000000-0000-0000-0000-000000000000']
  const [{ data: quotas }, { data: bens }, { data: clausulas }, { data: doacoes }, { data: distrib }, { data: eventos }, { data: docs }] =
    await Promise.all([
      supabase.from('quotas').select('holding_id, socio_id, percentual, tipo_direito').in('holding_id', inHoldings),
      supabase.from('bens').select('holding_id, descricao, valor_mercado, municipio_uf').in('holding_id', inHoldings),
      supabase.from('clausulas').select('holding_id, tipo, descricao').in('holding_id', inHoldings),
      supabase.from('doacoes').select('holding_id, donatario_id, quantidade_quotas, status, data_conclusao').in('holding_id', inHoldings),
      supabase.from('distribuicoes').select('holding_id, competencia, valor_total, deliberacao').in('holding_id', inHoldings),
      supabase.from('eventos').select('holding_id, titulo, data_prevista, status, concluido_em').in('holding_id', inHoldings),
      supabase.from('documentos').select('holding_id, nome, tipo, competencia').in('holding_id', inHoldings),
    ])

  const quotasDe = (hid: string) => (quotas ?? []).filter((q) => q.holding_id === hid)
  const bensDe = (hid: string) => (bens ?? []).filter((b) => b.holding_id === hid)
  const clausulasDe = (hid: string) => (clausulas ?? []).filter((c) => c.holding_id === hid)

  // sucessão: quotas já transferidas em vida (doações concluídas)
  const transferido = (doacoes ?? []).filter((d) => d.status === 'concluida').reduce((a, d) => a + Number(d.quantidade_quotas ?? 0), 0)

  // "o que foi feito" — timeline simples
  type Item = { data: string | null; texto: string }
  const feitos: Item[] = []
  for (const e of eventos ?? []) if (e.status === 'concluido') feitos.push({ data: e.concluido_em, texto: e.titulo })
  for (const d of distrib ?? []) if (d.deliberacao) feitos.push({ data: d.competencia, texto: `Distribuição de lucros deliberada — ${formatarMoeda(Number(d.valor_total))}` })
  for (const d of doacoes ?? []) if (d.status === 'concluida') feitos.push({ data: d.data_conclusao, texto: `Doação concluída de ${d.quantidade_quotas}% a ${nomeSocio.get(d.donatario_id ?? '') ?? 'herdeiro'}` })
  feitos.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))

  return (
    <div className="min-h-[100dvh] bg-surface">
      {/* cabeçalho white-label */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              <img src={org.logo_url} alt={org.nome ?? ''} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-sm font-bold uppercase tracking-wide" style={{ color: cor }}>{org?.nome ?? 'Seu escritório'}</span>
            )}
            <span className="text-xs text-ink-soft">Portal da família</span>
          </div>
          <form>
            <PendingButton action={sairPortal} className="text-xs font-medium text-ink-soft transition hover:text-ink">Sair</PendingButton>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>{org?.nome ?? ''}{org?.crc ? ` · CRC ${org.crc}` : ''}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">{family?.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">Um retrato do seu patrimônio organizado — atualizado pelo seu escritório.</p>

        {acessos.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {acessos.map((a) => (
              <a key={a.family_id} href={`/portal?fam=${a.family_id}`}
                 className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${a.family_id === familyId ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-muted'}`}>
                Família {a.family_id === familyId ? '(atual)' : ''}
              </a>
            ))}
          </div>
        )}

        {/* sucessão em andamento */}
        {transferido > 0 && (
          <div className="mt-6 rounded-xl2 border border-line bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sucessão em andamento</h2>
            <p className="mt-2 text-sm text-ink">
              Já foram <strong>transferidos em vida {transferido}%</strong> das quotas às próximas gerações, com planejamento — reduzindo custo e conflito futuros.
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full" style={{ width: `${Math.min(transferido, 100)}%`, backgroundColor: cor }} />
            </div>
          </div>
        )}

        {/* estrutura */}
        <h2 className="mt-8 text-sm font-bold text-ink">A estrutura</h2>
        <div className="mt-3 space-y-4">
          {(holdings ?? []).map((h) => (
            <div key={h.id} className="rounded-xl2 border border-line bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold text-ink">{h.razao_social}</h3>
                <span className="text-xs text-ink-soft">{h.cnpj ?? h.tipo_societario?.toUpperCase()}</span>
              </div>
              {quotasDe(h.id).length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Sócios</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink">
                    {quotasDe(h.id).map((q, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{nomeSocio.get(q.socio_id ?? '') ?? 'sócio'}</span>
                        <span className="text-ink-muted">{q.percentual}% · {LABEL_TIPO_DIREITO[q.tipo_direito]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {bensDe(h.id).length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Bens</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink">
                    {bensDe(h.id).map((b, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{b.descricao}</span>
                        <span className="shrink-0 text-ink-muted">{b.valor_mercado ? formatarMoeda(Number(b.valor_mercado)) : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {clausulasDe(h.id).length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Proteções</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                    {clausulasDe(h.id).map((c, i) => <li key={i}>{c.tipo.replaceAll('_', ' ')}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* o que foi feito */}
        {feitos.length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-bold text-ink">O que foi feito</h2>
            <div className="mt-3 rounded-xl2 border border-line bg-white p-5">
              <ul className="space-y-2.5">
                {feitos.slice(0, 12).map((f, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                    <span className="text-ink">{f.texto}</span>
                    <span className="ml-auto shrink-0 text-xs text-ink-soft">{f.data ? formatarData(f.data) : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* cofre */}
        {(docs ?? []).length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-bold text-ink">Documentos guardados</h2>
            <div className="mt-3 rounded-xl2 border border-line bg-white p-5">
              <ul className="space-y-2 text-sm">
                {(docs ?? []).map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-ink">{d.nome}</span>
                    <span className="shrink-0 text-xs text-ink-soft">{d.tipo?.replaceAll('_', ' ')}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-soft">Guarda organizada pelo seu escritório. Para uma cópia, fale com ele.</p>
            </div>
          </>
        )}

        <p className="mt-10 text-center text-[11px] text-ink-soft">
          Valores e datas são estimativas de cenário organizadas pelo seu escritório. Instrumentos jurídicos são de responsabilidade do advogado.
        </p>
      </main>
    </div>
  )
}

function Vazio() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-bold text-ink">Sem acesso ativo</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Esta conta ainda não está vinculada a nenhuma família. Se você recebeu um convite, abra o link do convite novamente.
        </p>
        <form className="mt-4">
          <PendingButton action={sairPortal} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface">Sair</PendingButton>
        </form>
      </div>
    </main>
  )
}
