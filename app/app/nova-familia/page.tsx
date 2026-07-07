import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui'
import { WizardNovaFamilia } from '@/components/wizard-nova-familia'

export const dynamic = 'force-dynamic'

export default function NovaFamiliaPage() {
  return (
    <div>
      <Link href="/app" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition hover:text-navy">
        <ChevronLeft size={14} /> Carteira
      </Link>
      <PageHeader
        eyebrow="Assistente"
        title="Nova família"
        description="Cadastre a família, os sócios e a primeira holding num fluxo só. Ao concluir, você cai direto no painel da família."
      />
      <Card className="p-6">
        <WizardNovaFamilia />
      </Card>
    </div>
  )
}
