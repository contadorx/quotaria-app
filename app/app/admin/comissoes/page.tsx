import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader, Pill, EmptyState, Label, SubmitButton, fieldClass } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { PendingButton } from '@/components/submit-button'
import { DeleteButton } from '@/components/delete-button'
import { formatarMoeda } from '@/lib/format'
import { gerarFatura, marcarNfSolicitada, marcarNfRecebida, marcarPaga, excluirFatura, salvarReguaComissao, enviarEmailFatura } from '../parceiros-actions'
import { emailConfigurado } from '@/lib/brevo'

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
function subst(tpl: string, campos: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => campos[k] ?? '')
}

export default async function AdminComissoesPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const supabase = createClient()
  const emailOk = emailConfigurado()
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
  const { data: msgsData } = await supabase.from('comissao_mensagens').select('chave, assunto, corpo')
  const msg = new Map<string, { assunto: string; corpo: string }>((msgsData ?? []).map((m) => [m.chave, { assunto: m.assunto, corpo: m.corpo }]))
  const mget = (chave: string) => msg.get(chave) ?? { assunto: '', corpo: '' }

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
      {!emailOk && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Envio automático por e-mail desligado. Para ativar, defina <code>BREVO_API_KEY</code> e <code>EMAIL_FROM</code> nas variáveis da Vercel. Enquanto isso, use o link <strong>abrir no e-mail</strong>.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <EditDialog title="Régua de comunicação da comissão" label="✉ Ajustar régua de comunicação">
          <form className="space-y-5">
            <p className="text-xs text-ink-muted">
              Campos que o sistema substitui: <code>{'{{nome}}'}</code> <code>{'{{competencia}}'}</code> <code>{'{{valor}}'}</code> <code>{'{{documento}}'}</code> <code>{'{{pix}}'}</code> <code>{'{{nf_numero}}'}</code>.
            </p>
            {([['solicitar_nf', '1 · Pedido de NF (comissão do mês)'], ['lembrete', '2 · Lembrete da NF'], ['pagamento', '3 · Aviso de pagamento']] as const).map(([chave, titulo]) => {
              const m = mget(chave)
              return (
                <div key={chave} className="rounded-lg border border-line p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-deep">{titulo}</p>
                  <div><Label htmlFor={`${chave}_assunto`}>Assunto</Label><input id={`${chave}_assunto`} name={`${chave}_assunto`} defaultValue={m.assunto} className={fieldClass} /></div>
                  <div className="mt-2"><Label htmlFor={`${chave}_corpo`}>Mensagem</Label><textarea id={`${chave}_corpo`} name={`${chave}_corpo`} rows={6} defaultValue={m.corpo} className={fieldClass} /></div>
                </div>
              )
            })}
            <SubmitButton action={salvarReguaComissao}>Salvar régua</SubmitButton>
          </form>
        </EditDialog>
        <a href="/app/admin/parceiros" className="text-sm font-medium text-ink-muted underline">Cadastro de parceiros →</a>
      </div>

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
                        const campos = {
                          nome: cad?.nome ?? '',
                          competencia: compLabel(f.competencia),
                          valor: formatarMoeda(Number(f.valor)),
                          documento: cad?.documento ? `${cad?.nome} (${cad?.documento})` : (cad?.nome ?? nome),
                          pix: cad?.chave_pix ?? '',
                          nf_numero: f.nf_numero ?? '',
                        }
                        const mSol = mget('solicitar_nf'), mLem = mget('lembrete'), mPag = mget('pagamento')
                        return (
                          <div key={f.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                            <span className="w-20 font-semibold text-ink">{compLabel(f.competencia)}</span>
                            <span className="w-24 text-ink-muted">{formatarMoeda(Number(f.valor))}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${f.status === 'paga' ? 'bg-emerald-50 text-emerald-700' : f.status === 'nf_recebida' ? 'bg-sky-50 text-sky-700' : f.status === 'nf_solicitada' ? 'bg-amber-50 text-amber-700' : 'bg-cream text-navy'}`}>
                              {f.status === 'a_enviar' ? 'a enviar' : f.status === 'nf_solicitada' ? 'NF solicitada' : f.status === 'nf_recebida' ? 'NF recebida' : 'paga'}
                            </span>
                            {f.nf_numero && <span className="text-[11px] text-ink-soft">NF {f.nf_numero}</span>}
                            <div className="ml-auto flex flex-wrap items-center gap-2">
                              {f.status === 'a_enviar' && emailOk && cad?.email && (
                                <form><input type="hidden" name="id" value={f.id} /><input type="hidden" name="chave" value="solicitar_nf" /><PendingButton action={enviarEmailFatura} className="rounded-md bg-navy px-2 py-1 text-[11px] font-semibold text-white hover:bg-navy-soft">✉ Enviar pedido de NF</PendingButton></form>
                              )}
                              {f.status === 'a_enviar' && cad?.email && (
                                <a href={mailto(cad.email, subst(mSol.assunto, campos), subst(mSol.corpo, campos))} className="text-[11px] text-ink-soft underline hover:text-navy">↗ e-mail</a>
                              )}
                              {f.status === 'a_enviar' && (
                                <form><input type="hidden" name="id" value={f.id} /><PendingButton action={marcarNfSolicitada} className="text-[11px] text-ink-soft hover:text-navy">marcar solicitada</PendingButton></form>
                              )}
                              {f.status === 'nf_solicitada' && emailOk && cad?.email && (
                                <form><input type="hidden" name="id" value={f.id} /><input type="hidden" name="chave" value="lembrete" /><PendingButton action={enviarEmailFatura} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-muted hover:border-gold">✉ Enviar lembrete</PendingButton></form>
                              )}
                              {f.status === 'nf_solicitada' && cad?.email && (
                                <a href={mailto(cad.email, subst(mLem.assunto, campos), subst(mLem.corpo, campos))} className="text-[11px] text-ink-soft underline hover:text-navy">↗ e-mail</a>
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
                              {f.status === 'nf_recebida' && emailOk && cad?.email && (
                                <form><input type="hidden" name="id" value={f.id} /><input type="hidden" name="chave" value="pagamento" /><PendingButton action={enviarEmailFatura} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-muted hover:border-gold">✉ Enviar aviso de pagamento</PendingButton></form>
                              )}
                              {f.status === 'nf_recebida' && cad?.email && (
                                <a href={mailto(cad.email, subst(mPag.assunto, campos), subst(mPag.corpo, campos))} className="text-[11px] text-ink-soft underline hover:text-navy">↗ e-mail</a>
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
