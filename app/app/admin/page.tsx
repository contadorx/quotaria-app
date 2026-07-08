import Link from 'next/link'
import { Lock, BellRing, MessageSquare, LifeBuoy, BookOpen, Bot, MessageSquareText, HandCoins, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader } from '@/components/ui'
import { ContasAdmin, type ContaAdmin } from '@/components/admin/contas-admin'

export const dynamic = 'force-dynamic'

type Painel = {
  mrr: number
  mrr_potencial: number
  total: number
  ativa: number
  trial: number
  bonus: number
  inadimplente: number
  cancelada: number
  teste: number
  novos_30d: number
  por_plano: { essencial: number; profissional: number; family_office: number }
  por_ciclo: { mensal: number; semestral: number; anual: number }
  ia_mes: number
  ia_hoje: number
  serie: { mes: string; novos: number }[]
  lista: ContaAdmin[]
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function mesLabel(m: string) {
  const [a, mm] = m.split('-')
  const nomes = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[Number(mm)]}/${a.slice(2)}`
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data } = await supabase.rpc('painel_negocio')
  const n = data as Painel | null

  if (!n) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Painel restrito</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Esta área é do administrador do negócio Quotaria.
          </p>
        </Card>
      </div>
    )
  }

  const ticketMedio = n.ativa > 0 ? Number(n.mrr) / n.ativa : 0
  const maxSerie = Math.max(1, ...n.serie.map((s) => s.novos))

  const kpis: { label: string; valor: string; sub?: string; destaque?: boolean; alerta?: boolean }[] = [
    { label: 'MRR (pagantes)', valor: brl(Number(n.mrr)), destaque: true },
    { label: 'Ticket médio', valor: ticketMedio > 0 ? brl(ticketMedio) : '—', sub: 'por escritório pagante' },
    { label: 'MRR potencial', valor: brl(Number(n.mrr_potencial)), sub: 'trials + bônus fundador' },
    { label: 'Assinantes ativos', valor: String(n.ativa) },
    { label: 'Em trial', valor: String(n.trial) },
    { label: 'Bônus fundador', valor: String(n.bonus), sub: 'alunos (12 meses)' },
    { label: 'Inadimplentes', valor: String(n.inadimplente), alerta: n.inadimplente > 0 },
    { label: 'Novos (30 dias)', valor: String(n.novos_30d) },
    { label: 'Assistente IA (mês)', valor: String(n.ia_mes), sub: `${n.ia_hoje} hoje` },
    { label: 'Contas de teste', valor: String(n.teste), sub: 'fora das métricas' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Negócio"
        title="Painel do negócio"
        description="O Quotaria como empresa: assinantes, receita e saúde da base."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/app/admin/cobranca"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <BellRing size={15} /> Cobrança
            </Link>
            <Link
              href="/app/admin/comunicacao"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <MessageSquare size={15} /> Comunicação
            </Link>
            <Link
              href="/app/admin/suporte"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <LifeBuoy size={15} /> Suporte
            </Link>
            <Link
              href="/app/admin/ajuda"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <BookOpen size={15} /> Base
            </Link>
            <Link
              href="/app/admin/assistente"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <Bot size={15} /> Assistente
            </Link>
            <Link
              href="/app/admin/feedbacks"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <MessageSquareText size={15} /> Feedbacks
            </Link>
            <Link
              href="/app/admin/comissoes"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <HandCoins size={15} /> Comissões
            </Link>
            <Link
              href="/app/admin/parceiros"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <Users size={15} /> Parceiros
            </Link>
          </div>
        }
      />
      {searchParams?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {searchParams.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className={`p-4 ${k.destaque ? 'ring-2 ring-gold' : ''}`}
          >
            <p className="text-xs font-semibold text-ink-muted">{k.label}</p>
            <p
              className={`mt-1 text-xl font-extrabold tabular-nums ${
                k.alerta ? 'text-red-600' : k.destaque ? 'text-navy' : 'text-ink'
              }`}
            >
              {k.valor}
            </p>
            {k.sub && <p className="mt-0.5 text-[11px] text-ink-soft">{k.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_300px]">
        <Card className="p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Novos escritórios por mês
          </h2>
          {n.serie.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">Sem dados ainda.</p>
          ) : (
            <div className="flex items-end justify-between gap-3" style={{ height: 150 }}>
              {n.serie.map((s) => (
                <div key={s.mes} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-bold tabular-nums text-ink">{s.novos}</span>
                  <div
                    className="w-full max-w-[46px] rounded-t bg-navy"
                    style={{ height: `${(s.novos / maxSerie) * 110}px` }}
                  />
                  <span className="text-[10px] text-ink-soft">{mesLabel(s.mes)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Base por plano
          </h2>
          <div className="space-y-2.5 text-sm">
            {[
              { l: 'Essencial', v: n.por_plano.essencial },
              { l: 'Profissional', v: n.por_plano.profissional },
              { l: 'Family Office', v: n.por_plano.family_office },
            ].map((p) => (
              <div key={p.l} className="flex items-center justify-between">
                <span className="text-ink-muted">{p.l}</span>
                <span className="font-bold tabular-nums text-ink">{p.v}</span>
              </div>
            ))}
          </div>
          <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Ativas por ciclo
          </h2>
          <div className="space-y-2.5 text-sm">
            {[
              { l: 'Mensal', v: n.por_ciclo.mensal },
              { l: 'Semestral', v: n.por_ciclo.semestral },
              { l: 'Anual', v: n.por_ciclo.anual },
            ].map((c) => (
              <div key={c.l} className="flex items-center justify-between">
                <span className="text-ink-muted">{c.l}</span>
                <span className="font-bold tabular-nums text-ink">{c.v}</span>
              </div>
            ))}
            <div className="border-t border-line pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Canceladas</span>
                <span className="font-bold tabular-nums text-red-600">{n.cancelada}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-ink-muted">Total de contas</span>
                <span className="font-bold tabular-nums text-ink">{n.total}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ContasAdmin lista={n.lista} />

      <p className="text-[11px] text-ink-soft">
        MRR conta apenas escritórios com status Ativa (fora contas de teste). O MRR potencial soma
        trials e bônus fundador — vira MRR quando a cobrança confirmar. O rastreio de parceiro
        (ref) alimenta o fechamento do dia 15.
      </p>
    </div>
  )
}
