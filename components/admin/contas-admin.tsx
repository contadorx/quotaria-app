'use client'

import { EditDialog } from '@/components/edit-dialog'
import { SubmitButton } from '@/components/submit-button'
import { fieldClass, Label } from '@/components/ui'
import { updateAssinatura } from '@/app/app/admin/actions'

export type ContaAdmin = {
  id: string
  nome: string
  status: string
  plano: string
  ciclo: string
  valor_mensal: number
  criado_em: string
  trial_ate: string | null
  bonus_ate: string | null
  proximo_vencimento: string | null
  is_teste: boolean
  parceiro_ref: string | null
  obs_admin: string | null
  asaas_customer_id: string | null
  asaas_subscription_id: string | null
  email_dono: string | null
  membros: number
  familias: number
  holdings: number
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  trial: { label: 'Trial', cls: 'bg-cream text-navy' },
  bonus: { label: 'Bônus fundador', cls: 'bg-gold/15 text-gold-deep' },
  ativa: { label: 'Ativa', cls: 'bg-emerald-100 text-emerald-800' },
  inadimplente: { label: 'Inadimplente', cls: 'bg-red-100 text-red-700' },
  cancelada: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500' },
}

const PLANO_LABEL: Record<string, string> = {
  essencial: 'Essencial',
  profissional: 'Profissional',
  family_office: 'Family Office',
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBr(v: string | null) {
  if (!v) return '—'
  const [a, m, d] = v.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

function FormAssinatura({ conta }: { conta: ContaAdmin }) {
  return (
    <form className="space-y-3 p-5">
      <input type="hidden" name="org_id" value={conta.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`st-${conta.id}`}>Status</Label>
          <select id={`st-${conta.id}`} name="status" defaultValue={conta.status} className={fieldClass}>
            <option value="trial">Trial</option>
            <option value="bonus">Bônus fundador (aluno)</option>
            <option value="ativa">Ativa (pagante)</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`pl-${conta.id}`}>Plano</Label>
          <select id={`pl-${conta.id}`} name="plano" defaultValue={conta.plano} className={fieldClass}>
            <option value="essencial">Essencial</option>
            <option value="profissional">Profissional</option>
            <option value="family_office">Family Office</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`vl-${conta.id}`}>Valor mensal (R$)</Label>
          <input
            id={`vl-${conta.id}`}
            name="valor_mensal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={conta.valor_mensal}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor={`ci-${conta.id}`}>Ciclo</Label>
          <select id={`ci-${conta.id}`} name="ciclo" defaultValue={conta.ciclo} className={fieldClass}>
            <option value="mensal">Mensal</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`tr-${conta.id}`}>Trial até</Label>
          <input id={`tr-${conta.id}`} name="trial_ate" type="date" defaultValue={conta.trial_ate ?? ''} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`bo-${conta.id}`}>Bônus até</Label>
          <input id={`bo-${conta.id}`} name="bonus_ate" type="date" defaultValue={conta.bonus_ate ?? ''} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor={`pv-${conta.id}`}>Próximo vencimento</Label>
          <input
            id={`pv-${conta.id}`}
            name="proximo_vencimento"
            type="date"
            defaultValue={conta.proximo_vencimento ?? ''}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor={`pr-${conta.id}`}>Parceiro (ref)</Label>
          <input
            id={`pr-${conta.id}`}
            name="parceiro_ref"
            type="text"
            defaultValue={conta.parceiro_ref ?? ''}
            placeholder="ex.: PARC-JOAO"
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`ob-${conta.id}`}>Observações internas</Label>
        <textarea
          id={`ob-${conta.id}`}
          name="obs_admin"
          rows={2}
          defaultValue={conta.obs_admin ?? ''}
          className={fieldClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="is_teste" defaultChecked={conta.is_teste} className="h-4 w-4 rounded border-line" />
        Conta de teste (fora das métricas)
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`ac-${conta.id}`}>Asaas — cliente (cus_…)</Label>
          <input
            id={`ac-${conta.id}`}
            name="asaas_customer_id"
            type="text"
            defaultValue={conta.asaas_customer_id ?? ''}
            placeholder="cus_000000000000"
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor={`as-${conta.id}`}>Asaas — assinatura (sub_…)</Label>
          <input
            id={`as-${conta.id}`}
            name="asaas_subscription_id"
            type="text"
            defaultValue={conta.asaas_subscription_id ?? ''}
            placeholder="sub_000000000000"
            className={fieldClass}
          />
        </div>
      </div>
      <p className="text-[11px] text-ink-soft">
        Crie o cliente e a assinatura no painel do Asaas e cole os IDs aqui — o webhook faz o resto
        (confirma pagamento, ativa e move o próximo vencimento).
      </p>
      <div className="flex justify-end">
        <SubmitButton action={updateAssinatura}>Salvar</SubmitButton>
      </div>
    </form>
  )
}

export function ContasAdmin({ lista }: { lista: ContaAdmin[] }) {
  return (
    <div className="overflow-x-auto rounded-xl2 border border-line bg-white shadow-card">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-3">Escritório</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Plano</th>
            <th className="px-3 py-3 text-right">Mensal</th>
            <th className="px-3 py-3 text-center">Famílias</th>
            <th className="px-3 py-3 text-center">Holdings</th>
            <th className="px-3 py-3">Próx. venc.</th>
            <th className="px-3 py-3">Parceiro</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => {
            const meta = STATUS_META[c.status] ?? { label: c.status, cls: 'bg-slate-100 text-slate-600' }
            return (
              <tr key={c.id} className={`border-b border-line last:border-0 ${c.is_teste ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{c.nome}</div>
                  <div className="text-xs text-ink-soft">
                    {c.email_dono ?? 'sem e-mail'} · {c.membros} {c.membros === 1 ? 'membro' : 'membros'} · desde {dataBr(c.criado_em)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>
                    {meta.label}
                  </span>
                  {c.status === 'trial' && c.trial_ate && (
                    <div className="mt-0.5 text-[11px] text-ink-soft">até {dataBr(c.trial_ate)}</div>
                  )}
                  {c.status === 'bonus' && c.bonus_ate && (
                    <div className="mt-0.5 text-[11px] text-ink-soft">até {dataBr(c.bonus_ate)}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-ink">{PLANO_LABEL[c.plano] ?? c.plano}</td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{brl(Number(c.valor_mensal))}</td>
                <td className="px-3 py-3 text-center text-ink">{c.familias}</td>
                <td className="px-3 py-3 text-center text-ink">{c.holdings}</td>
                <td className="px-3 py-3 text-ink">{dataBr(c.proximo_vencimento)}</td>
                <td className="px-3 py-3 text-ink-soft">{c.parceiro_ref ?? '—'}</td>
                <td className="px-3 py-3 text-right">
                  <EditDialog title={`Assinatura — ${c.nome}`} compact>
                    <FormAssinatura conta={c} />
                  </EditDialog>
                </td>
              </tr>
            )
          })}
          {lista.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-sm text-ink-soft">
                Nenhum escritório ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
