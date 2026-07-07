import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileSignature, ScrollText, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card } from '@/components/ui'
import { MINUTAS_INFO } from '@/lib/minutas'

export const dynamic = 'force-dynamic'

const ICON: Record<string, typeof ScrollText> = {
  'aprovacao-contas': ScrollText,
  distribuicao: FileSignature,
}

export default async function MinutasPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: holding } = await supabase.from('holdings').select('razao_social, organization_id').eq('id', params.id).single()
  if (!holding) notFound()

  const { data: org } = await supabase
    .from('organizations').select('assinatura_provedor').eq('id', holding.organization_id).maybeSingle()
  const zapAtivo = org?.assinatura_provedor === 'zapsign'

  return (
    <div>
      <PageHeader
        back={{ href: `/app/holdings/${params.id}`, label: holding.razao_social }}
        eyebrow="Documentos"
        title="Gerar minuta"
        description="Atas do escopo do contador, preenchidas com os dados da holding. Gere, assine e arquive no cofre."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {MINUTAS_INFO.map((m) => {
          const Icon = ICON[m.tipo] ?? ScrollText
          return (
            <Link key={m.tipo} href={`/app/holdings/${params.id}/minutas/${m.tipo}`}>
              <Card className="h-full p-5 transition hover:border-gold hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy">
                  <Icon size={18} />
                </div>
                <h2 className="mt-3 text-base font-bold text-navy">{m.titulo}</h2>
                <p className="mt-1 text-sm text-ink-muted">{m.descricao}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-gold-deep">Gerar →</span>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* fronteira: o que NÃO é minuta do contador */}
      <Card className="mt-4 flex items-start gap-3 border-l-4 border-l-gold p-4">
        <Scale size={18} className="mt-0.5 shrink-0 text-gold-deep" />
        <div>
          <p className="text-sm font-semibold text-ink">Doações, cláusulas e alterações contratuais são do advogado</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            O Quotaria gera as atas de registro societário (aprovação de contas e deliberação de distribuição).
            Instrumentos de doação, cláusulas de proteção, acordos de quotistas e alterações do contrato social
            são redigidos e interpretados pelo advogado parceiro — o app organiza e encaminha, não redige.
          </p>
        </div>
      </Card>

      {/* fluxo + status do modelo B */}
      <Card className="mt-4 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Como assinar</h2>
        <ol className="mt-2 space-y-1.5 text-sm text-ink">
          <li><strong className="text-navy">1.</strong> Gere a minuta e confira os dados.</li>
          <li><strong className="text-navy">2.</strong> Assine na sua ferramenta (ZapSign, gov.br, Clicksign — a que você já usa) e colha as assinaturas da família.</li>
          <li><strong className="text-navy">3.</strong> Arquive a versão assinada no cofre desta holding.</li>
        </ol>
        <div className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          {zapAtivo ? (
            <>Envio direto pelo ZapSign <strong className="text-emerald-700">ativado</strong> — o botão aparece na minuta gerada, usando a sua conta.</>
          ) : (
            <>Quer enviar com um clique? Conecte a sua conta ZapSign em <Link href="/app/configuracoes" className="font-semibold text-navy underline-offset-2 hover:underline">Configurações</Link> — o custo da assinatura fica na sua conta, não na plataforma.</>
          )}
        </div>
      </Card>
    </div>
  )
}
