import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, Pill, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { PendingButton } from '@/components/submit-button'
import { DeleteButton } from '@/components/delete-button'
import { formatarMoeda } from '@/lib/format'
import { gerarFatura, marcarNfSolicitada, marcarNfRecebida, marcarPaga, excluirFatura } from '../parceiros-actions'

export const dynamic = 'force-dynamic'

type Row = { parceiro_ref: string; organization_id: string; nome: string; plano: string; status: string; valor: number; comissao: number }
type Parceiro = { ref: string; nome: string; email: string | null; documento: string | null; chave_pix: string | null }
type Fatura = { id: string; parceiro_ref: string; competencia: string; valor: number; status: string; nf_numero: string | null; nf_link: string | null; paga_em: string | null }

const LABEL_PLANO: Record<string, string> = { essencial: 'Essencial', profissional: 'Profissional', family_office: 'Family Office' }
const LABEL_STATUS: Record<string, string> = { trial: 'Trial', bonus: 'Bônus', pendente: 'Pendente', ativa: 'Ativa', inadimplente: 'Inadimplente', cancelada: 'Cancelada' }
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function compLabel(iso: string) {
  const [y, m] = iso.split('-')
  return `${MESES[Number(m) - 1]}/${y}`
}
function mailto(to: string, subject: string, body: string) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default async function AdminComissoesPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_comissoes_parceiros')
  const rows = data as Row[] | null
  if (!rows) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio vê as comissões.</p>
        </Card>
      </div>
    )
  }

  const { data: parceirosData } = await supabase.from('parceiros').select('ref, nome, email, documento, chave_pix')
  const parceiroDe = new Map<string, Parceiro>((parceirosData ?? []).map((p) => [p.ref, p as Parceiro]))
  const { data: faturasData } = await supabase.from('comissao_faturas').select('id, parceiro_ref, competencia, valor, status, nf_numero, nf_link, paga_em').order('competencia', { ascending: false })
  const faturasDe = new Map<string, Fatura[]>()
  for (const f of (faturasData ?? []) as Fatura[]) {
    const l = faturasDe.get(f.parceiro_ref) ?? []; l.push(f); faturasDe.set(f.parceiro_ref, l)
  }

  const hoje = new Date()
  const comp = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

  const porParceiro = new Map<string, Row[]>()
  for (const r of rows) { const l = porParceiro.get(r.parceiro_ref) ?? []; l.push(r); porParceiro.set(r.parceiro_ref, l) }
  const parceiros = Array.from(porParceiro.entries()).map(([ref, lista]) => {
    const ativos = lista.filter((r) => r.status === 'ativa')
    return { ref, lista, ativos: ativos.length, indicados: lista.length, mrr: ativos.reduce((a, r) => a + Number(r.valor), 0), comissao: lista.reduce((a, r) => a + Number(r.comissao), 0) }
  }).sort((a, b) => b.comissao - a.comissao)

  const totalComissao = parceiros.reduce((a, p) => a + p.comissao, 0)
  const totalAtivos = parceiros.reduce((a, p) => a + p.ativos, 0)

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negócio" title="Comissões por parceiro" />
      <p className="-mt-2 text-sm text-ink-muted">
        Comissão recorrente de <strong>20%</strong> sobre as assinaturas ativas indicadas por cada parceiro. Gere a fatura do mês,
        peça a NF e registre o pagamento — os e-mails já saem prontos. Cadastre nomes e dados em <a href="/app/admin/parceiros" className="text-navy underline">Parceiros</a>.
      </p>

      {searchParams?.message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{searchParams.message}</p>}
      {searchParams?.error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{searchParams.error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Parceiros com indicação</p><p className="mt-1 text-2xl font-extrabold text-navy">{parceiros.length}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Assinantes ativos indicados</p><p className="mt-1 text-2xl font-extrabold text-navy">{totalAtivos}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Comissão mensal total</p><p className="mt-1 text-2xl font-extrabold text-gold-deep">{formatarMoeda(totalComissao)}</p></Card>
      </div>

      {parceiros.length === 0 ? (
        <EmptyState>Nenhuma assinatura indicada por parceiro ainda. Quando alguém se cadastrar com ?ref= de um parceiro, aparece aqui.</EmptyState>
      ) : (
        <div className="space-y-4">
          {parceiros.map((p) => {
            const cad = parceiroDe.get(p.ref)
            const nome = cad?.nome ?? p.ref
            const faturas = faturasDe.get(p.ref) ?? []
            const compValor = p.comissao.toFixed(2)
            return (
              <Card key={p.ref} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-navy">{nome} <span className="font-mono text-xs font-normal text-ink-soft">?ref={p.ref}</span></h3>
                  <div className="text-sm text-ink-muted">{p.ativos}/{p.indicados} ativos · MRR {formatarMoeda(p.mrr)} · <strong className="text-gold-deep">comissão {formatarMoeda(p.comissao)}/mês</strong></div>
                </div>
                {!cad && <p className="mt-1 text-xs text-amber-700">Parceiro não cadastrado — <a href="/app/admin/parceiros" className="underline">cadastre</a> para usar o nome e os e-mails da NF.</p>}

                <div className="mt-3 divide-y divide-line">
                  {p.lista.map((r) => (
                    <div key={r.organization_id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                      <span className="min-w-[9rem] flex-1 font-medium text-ink">{r.nome}</span>
                      <Pill>{LABEL_PLANO[r.plano] ?? r.plano ?? '—'}</Pill>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${r.status === 'ativa' ? 'bg-emerald-50 text-emerald-700' : r.status === 'inadimplente' ? 'bg-amber-50 text-amber-700' : 'bg-cream text-navy'}`}>{LABEL_STATUS[r.status] ?? r.status}</span>
                      <span className="w-24 text-right font-semibold text-ink">{Number(r.comissao) > 0 ? formatarMoeda(Number(r.comissao)) : '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Ciclo da NF */}
                <div className="mt-4 rounded-lg bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Faturas · pagamento contra NF</p>
                    <form>
                      <input type="hidden" name="parceiro_ref" value={p.ref} />
                      <input type="hidden" name="competencia" value={comp} />
                      <input type="hidden" name="valor" value={compValor} />
                      <SubmitButton action={gerarFatura}>Gerar fatura de {compLabel(comp)} ({formatarMoeda(p.comissao)})</SubmitButton>
                    </form>
                  </div>

                  {faturas.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-soft">Nenhuma fatura gerada. Gere a do mês para iniciar o ciclo da NF.</p>
                  ) : (
                    <div className="mt-2 divide-y divide-line">
                      {faturas.map((f) => {
                        const dadosNf = cad?.documento ? `${cad?.nome} (${cad?.documento})` : (cad?.nome ?? nome)
                        const bodySolicita = `Olá, ${cad?.nome ?? ''}!\n\nSua comissão recorrente do Quotaria referente a ${compLabel(f.competencia)} fechou em ${formatarMoeda(Number(f.valor))} (20% das assinaturas ativas que você indicou).\n\nPara o pagamento, emita a nota fiscal de ${formatarMoeda(Number(f.valor))} em nome de ${dadosNf} e responda este e-mail com o PDF.\nAssim que a NF chegar, faço o PIX${cad?.chave_pix ? ' (' + cad?.chave_pix + ')' : ''} no mesmo dia.\n\nObrigado pela parceria!\nLeandro — Quotaria`
                        const bodyPaga = `Olá, ${cad?.nome ?? ''}!\n\nA comissão de ${compLabel(f.competencia)} (${formatarMoeda(Number(f.valor))}) foi paga via PIX.${f.nf_numero ? '\nNF ' + f.nf_numero + ' recebida e arquivada.' : ''}\n\nAté o próximo mês!\nLeandro — Quotaria`
                        return (
                          <div key={f.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                            <span className="w-20 font-semibold text-ink">{compLabel(f.competencia)}</span>
                            <span className="w-24 text-ink-muted">{formatarMoeda(Number(f.valor))}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${f.status === 'paga' ? 'bg-emerald-50 text-emerald-700' : f.status === 'nf_recebida' ? 'bg-sky-50 text-sky-700' : f.status === 'nf_solicitada' ? 'bg-amber-50 text-amber-700' : 'bg-cream text-navy'}`}>
                              {f.status === 'a_enviar' ? 'a enviar' : f.status === 'nf_solicitada' ? 'NF solicitada' : f.status === 'nf_recebida' ? 'NF recebida' : 'paga'}
                            </span>
                            {f.nf_numero && <span className="text-[11px] text-ink-soft">NF {f.nf_numero}</span>}
                            <div className="ml-auto flex flex-wrap items-center gap-2">
                              {f.status === 'a_enviar' && cad?.email && (
                                <a href={mailto(cad.email, `Quotaria — sua comissão de ${compLabel(f.competencia)}: ${formatarMoeda(Number(f.valor))}`, bodySolicita)} className="rounded-md border border-navy px-2 py-1 text-[11px] font-semibold text-navy hover:bg-navy hover:text-white">✉ Pedir NF</a>
                              )}
                              {f.status === 'a_enviar' && (
                                <form><input type="hidden" name="id" value={f.id} /><PendingButton action={marcarNfSolicitada} className="text-[11px] text-ink-soft hover:text-navy">marcar solicitada</PendingButton></form>
                              )}
                              {f.status === 'nf_solicitada' && (
                                <EditDialog title={`Registrar NF — ${compLabel(f.competencia)}`} label="Registrar NF">
                                  <form className="space-y-3">
                                    <input type="hidden" name="id" value={f.id} />
                                    <div><Label htmlFor={`nf-${f.id}`}>Número da NF</Label><input id={`nf-${f.id}`} name="nf_numero" className={fieldClass} /></div>
                                    <div><Label htmlFor={`nfl-${f.id}`}>Link/arquivo (opcional)</Label><input id={`nfl-${f.id}`} name="nf_link" className={fieldClass} /></div>
                                    <SubmitButton action={marcarNfRecebida}>Confirmar recebida</SubmitButton>
                                  </form>
                                </EditDialog>
                              )}
                              {f.status === 'nf_recebida' && cad?.email && (
                                <a href={mailto(cad.email, `Quotaria — comissão de ${compLabel(f.competencia)} paga`, bodyPaga)} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-muted hover:border-gold">✉ Aviso de pagamento</a>
                              )}
                              {f.status === 'nf_recebida' && (
                                <form><input type="hidden" name="id" value={f.id} /><PendingButton action={marcarPaga} className="rounded-md bg-navy px-2 py-1 text-[11px] font-semibold text-white hover:bg-navy-soft">marcar paga</PendingButton></form>
                              )}
                              {f.status === 'paga' && <span className="text-[11px] text-emerald-700">✓ paga</span>}
                              <DeleteButton action={excluirFatura} id={f.id} label={`a fatura de ${compLabel(f.competencia)}`} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-ink-soft">Refere-se à comissão do <strong>sistema</strong> (20% recorrente). A do curso (Formação) é paga pela Hotmart direto ao afiliado e não entra aqui.</p>
    </div>
  )
}
