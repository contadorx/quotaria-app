import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, Pill, EmptyState } from '@/components/ui'
import { formatarMoeda } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Row = { parceiro_ref: string; organization_id: string; nome: string; plano: string; status: string; valor: number; comissao: number }

const LABEL_PLANO: Record<string, string> = { essencial: 'Essencial', profissional: 'Profissional', family_office: 'Family Office' }
const LABEL_STATUS: Record<string, string> = {
  trial: 'Trial', bonus: 'Bônus', pendente: 'Pendente', ativa: 'Ativa', inadimplente: 'Inadimplente', cancelada: 'Cancelada',
}

export default async function AdminComissoesPage() {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_comissoes_parceiros')
  const rows = data as Row[] | null

  if (!rows) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio vê as comissões dos parceiros.</p>
        </Card>
      </div>
    )
  }

  // agrupa por parceiro
  const porParceiro = new Map<string, Row[]>()
  for (const r of rows) {
    const l = porParceiro.get(r.parceiro_ref) ?? []
    l.push(r)
    porParceiro.set(r.parceiro_ref, l)
  }
  const parceiros = Array.from(porParceiro.entries()).map(([ref, lista]) => {
    const ativos = lista.filter((r) => r.status === 'ativa')
    return {
      ref,
      lista,
      indicados: lista.length,
      ativos: ativos.length,
      mrr: ativos.reduce((a, r) => a + Number(r.valor), 0),
      comissao: lista.reduce((a, r) => a + Number(r.comissao), 0),
    }
  }).sort((a, b) => b.comissao - a.comissao)

  const totalComissao = parceiros.reduce((a, p) => a + p.comissao, 0)
  const totalAtivos = parceiros.reduce((a, p) => a + p.ativos, 0)

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negócio" title="Comissões por parceiro" />
      <p className="-mt-2 text-sm text-ink-muted">
        Comissão recorrente de <strong>20%</strong> sobre o valor mensal das assinaturas ativas indicadas por cada parceiro
        (via <code>?ref=</code> no cadastro). Assinaturas inadimplentes ou canceladas entram na lista, mas não geram comissão até voltarem a pagar.
      </p>

      {/* resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Parceiros com indicação</p><p className="mt-1 text-2xl font-extrabold text-navy">{parceiros.length}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Assinantes ativos indicados</p><p className="mt-1 text-2xl font-extrabold text-navy">{totalAtivos}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Comissão mensal total</p><p className="mt-1 text-2xl font-extrabold text-gold-deep">{formatarMoeda(totalComissao)}</p></Card>
      </div>

      {parceiros.length === 0 ? (
        <EmptyState>Nenhuma assinatura indicada por parceiro ainda. Quando alguém se cadastrar com o link de um parceiro (?ref=), aparece aqui.</EmptyState>
      ) : (
        <div className="space-y-4">
          {parceiros.map((p) => (
            <Card key={p.ref} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-navy">Parceiro: <span className="font-mono">{p.ref}</span></h3>
                <div className="text-sm text-ink-muted">
                  {p.ativos} ativo{p.ativos === 1 ? '' : 's'} de {p.indicados} · MRR {formatarMoeda(p.mrr)} ·
                  <strong className="text-gold-deep"> comissão {formatarMoeda(p.comissao)}/mês</strong>
                </div>
              </div>
              <div className="mt-3 divide-y divide-line">
                {p.lista.map((r) => (
                  <div key={r.organization_id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="min-w-[10rem] flex-1 font-medium text-ink">{r.nome}</span>
                    <Pill>{LABEL_PLANO[r.plano] ?? r.plano ?? '—'}</Pill>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${r.status === 'ativa' ? 'bg-emerald-50 text-emerald-700' : r.status === 'inadimplente' ? 'bg-amber-50 text-amber-700' : 'bg-cream text-navy'}`}>
                      {LABEL_STATUS[r.status] ?? r.status}
                    </span>
                    <span className="w-24 text-right text-ink-muted">{formatarMoeda(Number(r.valor))}</span>
                    <span className="w-24 text-right font-semibold text-ink">{Number(r.comissao) > 0 ? formatarMoeda(Number(r.comissao)) : '—'}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-ink-soft">
        Referente às assinaturas do <strong>sistema</strong> (20% recorrente vitalício). A comissão do curso (Formação) é paga pela Hotmart direto ao afiliado e não aparece aqui.
      </p>
    </div>
  )
}
