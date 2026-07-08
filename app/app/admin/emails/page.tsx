import Link from 'next/link'
import { Lock, BellRing, MessageSquare, HandCoins, Mail, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, PageHeader } from '@/components/ui'
import { emailConfigurado } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

type Reguas = {
  cobranca: { ativa: boolean; passos: unknown[]; enviados_30d: number }
  comunicacao: { ativa: boolean; passos: unknown[]; enviados_30d: number }
}

export default async function AdminEmailsPage() {
  const supabase = createClient()
  const { data } = await supabase.rpc('admin_reguas')
  const r = data as Reguas | null
  if (!r) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm p-8 text-center">
          <Lock size={24} className="mx-auto text-ink-soft" />
          <h1 className="mt-2 text-lg font-bold text-ink">Página restrita</h1>
          <p className="mt-1 text-sm text-ink-muted">Só o administrador do negócio gerencia os e-mails.</p>
        </Card>
      </div>
    )
  }
  const { count: nMsgs } = await supabase.from('comissao_mensagens').select('*', { count: 'exact', head: true })
  const emailOk = emailConfigurado()

  const StatusPill = ({ on, on_txt, off_txt }: { on: boolean; on_txt: string; off_txt: string }) => (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-cream text-navy'}`}>{on ? on_txt : off_txt}</span>
  )

  const reguas = [
    { icon: BellRing, nome: 'Cobrança', href: '/app/admin/cobranca',
      desc: 'Dispara quando uma assinatura fica pendente ou inadimplente — lembra de pagar para não perder o acesso.',
      ativa: r.cobranca.ativa, passos: r.cobranca.passos.length, enviados: r.cobranca.enviados_30d },
    { icon: MessageSquare, nome: 'Comunicação', href: '/app/admin/comunicacao',
      desc: 'Boas-vindas e engajamento por tempo de conta (onboarding, dicas, reativação).',
      ativa: r.comunicacao.ativa, passos: r.comunicacao.passos.length, enviados: r.comunicacao.enviados_30d },
  ]

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negócio" title="Central de e-mails" />
      <p className="-mt-2 text-sm text-ink-muted">
        Todos os e-mails automáticos do Quotaria num só mapa. Cada um é editável no seu lugar (assunto, texto e campos de mesclagem) e sai pela Brevo.
      </p>

      <div className={`rounded-lg border px-4 py-2 text-xs ${emailOk ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        <Mail size={13} className="mr-1 inline" />
        {emailOk
          ? 'Envio pela Brevo ativo (BREVO_API_KEY e EMAIL_FROM configurados).'
          : 'Envio automático desligado — defina BREVO_API_KEY e EMAIL_FROM na Vercel para ligar.'}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {reguas.map((x) => (
          <Card key={x.nome} className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white"><x.icon size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-navy">{x.nome}</h3>
                  <StatusPill on={x.ativa} on_txt="ativa" off_txt="pausada" />
                </div>
                <p className="mt-1 text-sm text-ink-muted">{x.desc}</p>
                <p className="mt-2 text-xs text-ink-soft">{x.passos} passo{x.passos === 1 ? '' : 's'} · {x.enviados} enviado{x.enviados === 1 ? '' : 's'} nos últimos 30 dias</p>
                <Link href={x.href} className="mt-2 inline-block text-sm font-semibold text-navy underline">Editar régua →</Link>
              </div>
            </div>
          </Card>
        ))}

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold text-white"><HandCoins size={17} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-navy">Comissão (parceiros)</h3>
                <StatusPill on={(nMsgs ?? 0) > 0} on_txt="3 mensagens" off_txt="vazia" />
              </div>
              <p className="mt-1 text-sm text-ink-muted">Ciclo da NF: pedido da nota, lembrete e aviso de pagamento — enviados manualmente por parceiro/fatura.</p>
              <p className="mt-2 text-xs text-ink-soft">{nMsgs ?? 0} mensagens editáveis</p>
              <Link href="/app/admin/comissoes" className="mt-2 inline-block text-sm font-semibold text-navy underline">Editar em Comissões →</Link>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-soft text-white"><UserPlus size={17} /></span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-navy">Convites</h3>
              <p className="mt-1 text-sm text-ink-muted">Portal da família e acesso do advogado/contador. Enviados na hora, quando você cria o convite na página da família — não têm régua.</p>
              <p className="mt-2 text-xs text-ink-soft">Disparo imediato pela Brevo (com link de acesso).</p>
            </div>
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-ink-soft">Todos usam a mesma conta Brevo (remetente {emailOk ? 'configurado' : 'a configurar'}). As réguas de cobrança e comunicação rodam por agendamento; a de comissão e os convites são disparados por você.</p>
    </div>
  )
}
