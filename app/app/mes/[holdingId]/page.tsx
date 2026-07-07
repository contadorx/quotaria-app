import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Minus, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  formatarDataISO,
  formatarMoeda,
  LABEL_TIPO_DISTRIBUICAO,
  LABEL_TIPO_DOCUMENTO,
} from '@/lib/format'
import { PrintButton } from '@/components/print-button'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const ITENS: { campo: string; label: string }[] = [
  { campo: 'distribuicoes_ok', label: 'Distribuições deliberadas e registradas' },
  { campo: 'documentos_ok', label: 'Documentos do mês arquivados' },
  { campo: 'alertas_ok', label: 'Alertas e prazos tratados' },
  { campo: 'alugueis_ok', label: 'Aluguéis em regime de caixa' },
  { campo: 'doacoes_ok', label: 'Cronograma de doações em dia' },
]

export default async function ExtratoMensal({
  params,
  searchParams,
}: {
  params: { holdingId: string }
  searchParams: { ano?: string; mes?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hoje = new Date()
  const ano = Number(searchParams.ano) || hoje.getFullYear()
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1
  const mm = String(mes).padStart(2, '0')
  const competencia = `${ano}-${mm}-01`
  const prefixoMes = `${ano}-${mm}`
  const hojeISO = hoje.toISOString().slice(0, 10)

  const { data: orgId } = await supabase.rpc('current_org')
  const { data: org } = await supabase
    .from('organizations').select('nome, logo_url, cor_primaria').eq('id', orgId ?? '').maybeSingle()
  const corMarca = org?.cor_primaria ?? undefined

  const { data: holding } = await supabase.from('holdings').select('id, razao_social, family_id').eq('id', params.holdingId).single()
  if (!holding) notFound()
  const { data: family } = await supabase.from('families').select('id, name').eq('id', holding.family_id).single()
  const { data: contatos } = await supabase
    .from('family_contacts').select('email').eq('family_id', holding.family_id).eq('receber_relatorio', true)
  const emailsFamilia = (contatos ?? []).map((c) => c.email).filter(Boolean).join(',')

  const { data: socios } = await supabase.from('socios').select('id, nome').eq('family_id', holding.family_id)
  const nomeSocio = new Map((socios ?? []).map((s) => [s.id, s.nome]))

  const { data: fechamento } = await supabase
    .from('fechamentos')
    .select('distribuicoes_ok, documentos_ok, alertas_ok, alugueis_ok, doacoes_ok, notes')
    .eq('holding_id', params.holdingId).eq('competencia', competencia).maybeSingle()

  const { data: distTodas } = await supabase
    .from('distribuicoes').select('competencia, valor_total, tipo, deliberacao').eq('holding_id', params.holdingId)
  const distMes = (distTodas ?? []).filter((d) => d.competencia?.slice(0, 7) === prefixoMes)

  const { data: doacoesTodas } = await supabase
    .from('doacoes').select('doador_id, donatario_id, quantidade_quotas, valor_estimado, status, data_conclusao').eq('holding_id', params.holdingId)
  const doacoesMes = (doacoesTodas ?? []).filter((d) => d.status === 'concluida' && d.data_conclusao?.slice(0, 7) === prefixoMes)

  const { data: docsTodos } = await supabase
    .from('documentos').select('nome, tipo, competencia, created_at').eq('holding_id', params.holdingId)
  const docsMes = (docsTodos ?? []).filter((d) => (d.competencia?.slice(0, 7) ?? d.created_at.slice(0, 7)) === prefixoMes)

  const { data: eventosAll } = await supabase
    .from('eventos').select('holding_id, titulo, data_prevista, status')
  const eventos = (eventosAll ?? []).filter((e) => e.holding_id === params.holdingId || e.holding_id === null)
  const atasMes = eventos.filter((e) => e.status === 'concluido' && e.data_prevista.slice(0, 7) === prefixoMes)
  const proximo = eventos
    .filter((e) => e.status !== 'concluido' && e.data_prevista >= hojeISO)
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))[0]

  const okCount = fechamento
    ? [fechamento.distribuicoes_ok, fechamento.documentos_ok, fechamento.alertas_ok, fechamento.alugueis_ok, fechamento.doacoes_ok].filter(Boolean).length
    : 0
  const status = !fechamento
    ? { label: 'Mês não fechado', cls: 'bg-ink-soft/10 text-ink-muted' }
    : okCount === 5
      ? { label: 'Em dia', cls: 'bg-emerald-50 text-emerald-700' }
      : { label: 'Em andamento', cls: 'bg-amber-50 text-amber-700' }

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/app/mes?ano=${ano}&mes=${mes}`} className="text-sm text-ink-muted transition hover:text-ink">← Mês da Holding</Link>
        <div className="flex items-center gap-3">
          {emailsFamilia && (
            <a
              href={`mailto:${emailsFamilia}?subject=${encodeURIComponent(`Extrato mensal ${MESES[mes - 1]}/${ano} — ${holding.razao_social}`)}&body=${encodeURIComponent('Segue o extrato do mês da holding. Qualquer dúvida, estou à disposição.')}`}
              className="no-print inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              <Mail size={15} />
              Enviar por e-mail
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="print-page mx-auto max-w-[820px] rounded-xl2 border border-line bg-white p-10 shadow-card">
        <header className="flex items-start justify-between border-b border-navy/15 pb-6">
          <div>
            {org?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org?.nome ?? ''} className="mb-3 h-9 w-auto" />
            )}
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep" style={corMarca ? { color: corMarca } : undefined}>
              Extrato mensal · {MESES[mes - 1]} de {ano}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">{holding.razao_social}</h1>
            <p className="mt-1 text-sm text-ink-muted">{family?.name} · emitido em {formatarDataISO(hojeISO)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.cls}`}>{status.label}</span>
        </header>

        <Secao titulo="Rotina do mês cumprida">
          <ul className="grid gap-2 sm:grid-cols-2">
            {ITENS.map((it) => {
              const ok = fechamento ? (fechamento[it.campo as keyof typeof fechamento] as boolean) : false
              return (
                <li key={it.campo} className="flex items-center gap-2 text-sm">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-soft/10 text-ink-soft'}`}>
                    {ok ? <Check size={13} /> : <Minus size={13} />}
                  </span>
                  <span className={ok ? 'text-ink' : 'text-ink-soft'}>{it.label}</span>
                </li>
              )
            })}
          </ul>
        </Secao>

        <Secao titulo="Movimentações registradas">
          <Linha rotulo="Distribuições" vazio="Nenhuma neste mês.">
            {distMes.map((d, i) => (
              <Item key={i} esq={`${LABEL_TIPO_DISTRIBUICAO[d.tipo]}${d.deliberacao ? ` · ${d.deliberacao}` : ''}`} dir={formatarMoeda(Number(d.valor_total))} />
            ))}
          </Linha>
          <Linha rotulo="Doações concluídas" vazio="Nenhuma neste mês.">
            {doacoesMes.map((d, i) => (
              <Item key={i} esq={`${nomeSocio.get(d.doador_id ?? '') ?? '—'} → ${nomeSocio.get(d.donatario_id ?? '') ?? '—'} · ${d.quantidade_quotas} quotas`} dir={formatarMoeda(Number(d.valor_estimado ?? 0))} />
            ))}
          </Linha>
          <Linha rotulo="Documentos arquivados" vazio="Nenhum neste mês.">
            {docsMes.map((d, i) => <Item key={i} esq={d.nome} dir={LABEL_TIPO_DOCUMENTO[d.tipo]} />)}
          </Linha>
          <Linha rotulo="Atas e obrigações" vazio="Nenhuma neste mês.">
            {atasMes.map((e, i) => <Item key={i} esq={e.titulo} dir={formatarDataISO(e.data_prevista)} />)}
          </Linha>
        </Secao>

        <Secao titulo="Próximo marco">
          {proximo ? (
            <div className="flex items-center gap-3 rounded-lg bg-cream/60 px-4 py-3 text-sm">
              <span className="num font-semibold text-navy">{formatarDataISO(proximo.data_prevista)}</span>
              <span className="text-ink">{proximo.titulo}</span>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Nenhum marco futuro registrado.</p>
          )}
        </Secao>

        {fechamento?.notes && (
          <Secao titulo="Observações do contador">
            <p className="text-sm text-ink">{fechamento.notes}</p>
          </Secao>
        )}

        <footer className="mt-10 border-t border-navy/15 pt-4 text-xs leading-relaxed text-ink-soft">
          <p>Este extrato registra a manutenção contábil e documental da holding no período. Estimativas de valor variam conforme legislação e avaliação dos bens; a redação de instrumentos jurídicos cabe ao advogado.</p>
          <p className="mt-2">Preparado por {org?.nome ?? 'seu contador'}{user?.email ? ` · ${user.email}` : ''}.</p>
        </footer>
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">{titulo}</h2>
      {children}
    </section>
  )
}
function Linha({ rotulo, vazio, children }: { rotulo: string; vazio: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children]
  const temItens = arr.some((c) => c)
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{rotulo}</h3>
      {temItens ? <div className="space-y-1">{children}</div> : <p className="text-sm text-ink-soft">{vazio}</p>}
    </div>
  )
}
function Item({ esq, dir }: { esq: string; dir: string }) {
  return (
    <div className="flex justify-between border-b border-line/60 py-1.5 text-sm">
      <span className="text-ink">{esq}</span>
      <span className="num text-ink-muted">{dir}</span>
    </div>
  )
}
