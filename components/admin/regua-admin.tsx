'use client'

import { Plus, Trash2 } from 'lucide-react'
import { EditDialog } from '@/components/edit-dialog'
import { SubmitButton, PendingButton } from '@/components/submit-button'
import { Card, fieldClass, Label } from '@/components/ui'
import { toggleRegua, salvarPasso, excluirPasso } from '@/app/app/admin/reguas-actions'

export type PassoRegua = {
  id: string
  quando: number
  assunto: string
  corpo: string
  botao_texto?: string
  momento?: string
  ativo: boolean
}

const MOMENTO_LABEL: Record<string, string> = {
  apos_cadastro: 'Após o cadastro',
  apos_ativacao: 'Após a ativação',
}

function quandoLabel(tipo: 'cobranca' | 'comunicacao', p: PassoRegua) {
  if (tipo === 'cobranca') {
    if (p.quando < 0) return `${Math.abs(p.quando)} dia(s) ANTES do vencimento`
    if (p.quando === 0) return 'No dia do vencimento'
    return `${p.quando} dia(s) APÓS o vencimento`
  }
  const base = MOMENTO_LABEL[p.momento ?? ''] ?? p.momento
  return `${base} · dia ${p.quando}`
}

function FormPasso({
  tipo,
  passo,
}: {
  tipo: 'cobranca' | 'comunicacao'
  passo?: PassoRegua
}) {
  const uid = passo?.id ?? 'novo'
  return (
    <form className="space-y-3 p-5">
      <input type="hidden" name="tipo" value={tipo} />
      {passo && <input type="hidden" name="id" value={passo.id} />}
      <div className="grid grid-cols-2 gap-3">
        {tipo === 'comunicacao' && (
          <div>
            <Label htmlFor={`mo-${uid}`}>Momento</Label>
            <select
              id={`mo-${uid}`}
              name="momento"
              defaultValue={passo?.momento ?? 'apos_cadastro'}
              className={fieldClass}
            >
              <option value="apos_cadastro">Após o cadastro (conversão)</option>
              <option value="apos_ativacao">Após a ativação (retenção)</option>
            </select>
          </div>
        )}
        <div>
          <Label htmlFor={`qd-${uid}`}>
            {tipo === 'cobranca' ? 'Dias (−antes / +depois do venc.)' : 'Dia do toque'}
          </Label>
          <input
            id={`qd-${uid}`}
            name="quando"
            type="number"
            min={tipo === 'cobranca' ? -365 : 0}
            max={365}
            defaultValue={passo?.quando ?? (tipo === 'cobranca' ? -3 : 1)}
            className={fieldClass}
          />
        </div>
        {tipo === 'cobranca' && (
          <div>
            <Label htmlFor={`bt-${uid}`}>Texto do botão</Label>
            <input
              id={`bt-${uid}`}
              name="botao_texto"
              type="text"
              defaultValue={passo?.botao_texto ?? 'Abrir o Quotaria'}
              className={fieldClass}
            />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor={`as-${uid}`}>Assunto do e-mail</Label>
        <input id={`as-${uid}`} name="assunto" type="text" defaultValue={passo?.assunto ?? ''} className={fieldClass} />
      </div>
      <div>
        <Label htmlFor={`co-${uid}`}>Texto do e-mail</Label>
        <textarea id={`co-${uid}`} name="corpo" rows={5} defaultValue={passo?.corpo ?? ''} className={fieldClass} />
        <p className="mt-1 text-[11px] text-ink-soft">
          Placeholders: {'{{nome}}'}
          {tipo === 'cobranca' && (
            <>
              {' · '}
              {'{{valor}}'} · {'{{vencimento}}'}
            </>
          )}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="ativo" defaultChecked={passo?.ativo ?? true} className="h-4 w-4 rounded border-line" />
        Toque ativo
      </label>
      <div className="flex justify-end">
        <SubmitButton action={salvarPasso}>Salvar</SubmitButton>
      </div>
    </form>
  )
}

export function ReguaAdmin({
  tipo,
  ativa,
  passos,
  enviados30d,
}: {
  tipo: 'cobranca' | 'comunicacao'
  ativa: boolean
  passos: PassoRegua[]
  enviados30d: number
}) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-semibold text-ink">
            Régua {ativa ? 'ligada' : 'desligada'}
          </p>
          <p className="text-xs text-ink-muted">
            {enviados30d} e-mail(s) enviados nos últimos 30 dias.
            {!ativa && ' Nada é enviado enquanto estiver desligada.'}
          </p>
        </div>
        <form>
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="ativa" value={ativa ? 'false' : 'true'} />
          <PendingButton
            action={toggleRegua}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              ativa
                ? 'border border-line text-ink hover:bg-surface'
                : 'bg-navy text-white hover:bg-navy-soft'
            }`}
          >
            {ativa ? 'Desligar régua' : 'Ligar régua'}
          </PendingButton>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Toques ({passos.length})
        </h2>
        <EditDialog title="Novo toque" label="Novo toque">
          <FormPasso tipo={tipo} />
        </EditDialog>
      </div>

      <div className="space-y-2">
        {passos.map((p) => (
          <Card key={p.id} className={`flex items-start justify-between gap-3 p-4 ${p.ativo ? '' : 'opacity-50'}`}>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">
                {quandoLabel(tipo, p)}
                {!p.ativo && ' · inativo'}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">{p.assunto}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{p.corpo}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <EditDialog title={`Toque — ${quandoLabel(tipo, p)}`} compact>
                <FormPasso tipo={tipo} passo={p} />
              </EditDialog>
              <form>
                <input type="hidden" name="tipo" value={tipo} />
                <input type="hidden" name="id" value={p.id} />
                <PendingButton
                  action={excluirPasso}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </PendingButton>
              </form>
            </div>
          </Card>
        ))}
        {passos.length === 0 && (
          <Card className="p-6 text-center text-sm text-ink-soft">
            Nenhum toque cadastrado. Crie o primeiro com o botão acima. <Plus size={13} className="inline" />
          </Card>
        )}
      </div>
    </div>
  )
}
