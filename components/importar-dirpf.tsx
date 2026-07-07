'use client'

import { useState } from 'react'
import { FileScan, ShieldCheck } from 'lucide-react'
import { Card, Label, fieldClass } from '@/components/ui'

type Extraido = {
  n_imoveis: number
  patrimonio: number
  renda_aluguel_anual: number
  socio_pj: boolean
  recebe_dividendos: boolean
  n_herdeiros: number
}

function parseBRL(str: string): number {
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0
}

function extrairSinais(texto: string): Extraido {
  const t = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  const MOEDA = /\d{1,3}(?:\.\d{3})*,\d{2}/g

  // imóveis: entradas do Grupo 01 (Bens Imóveis) na ficha de Bens e Direitos
  const gImoveis = t.match(/GRUPO[:\s]*0?1\b/g)?.length ?? 0
  const n_imoveis = gImoveis > 0 ? gImoveis : Math.max(0, (t.match(/BENS IMOVEIS/g)?.length ?? 1) - 1)

  // patrimônio: linha TOTAL da seção de bens (situação em 31/12 — pega o maior 2º valor)
  let patrimonio = 0
  const linhasTotal = t.match(new RegExp(`TOTAL[^\\n]{0,120}`, 'g')) ?? []
  for (const linha of linhasTotal) {
    const vals = linha.match(MOEDA)
    if (vals && vals.length >= 1) {
      const v = parseBRL(vals[vals.length - 1])
      if (v > patrimonio) patrimonio = v
    }
  }

  // aluguel: maior valor monetário próximo a "ALUGU"
  let renda_aluguel_anual = 0
  let idx = t.indexOf('ALUGU')
  while (idx !== -1) {
    const vizinhanca = t.slice(idx, idx + 200)
    const vals = vizinhanca.match(MOEDA)
    if (vals) for (const v of vals) renda_aluguel_anual = Math.max(renda_aluguel_anual, parseBRL(v))
    idx = t.indexOf('ALUGU', idx + 1)
  }

  const socio_pj = /GRUPO[:\s]*0?3\b|PARTICIPACOES SOCIETARIAS|QUOTAS OU QUINHOES/.test(t)
  const recebe_dividendos = /LUCROS E DIVIDENDOS/.test(t)

  // herdeiros: filhos na ficha de Dependentes (proxy — confirme)
  const iDep = t.indexOf('DEPENDENTES')
  const trecho = iDep >= 0 ? t.slice(iDep, iDep + 4000) : ''
  const n_herdeiros = trecho.match(/FILH[OA]/g)?.length ?? 0

  return { n_imoveis, patrimonio, renda_aluguel_anual, socio_pj, recebe_dividendos, n_herdeiros }
}

export function ImportarDirpf({
  radarId,
  action,
}: {
  radarId: string
  action: (formData: FormData) => void
}) {
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const [ex, setEx] = useState<Extraido | null>(null)

  async function lerPdf(file: File) {
    setLendo(true)
    setErro('')
    setEx(null)
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
      let texto = ''
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p)
        const tc = await page.getTextContent()
        texto += tc.items.map((i) => ('str' in i ? i.str : '')).join(' ') + '\n'
      }
      setEx(extrairSinais(texto))
    } catch (e) {
      setErro(
        'Não consegui ler este PDF' +
          (e instanceof Error ? ` (${e.message})` : '') +
          '. Use a entrada manual dos sinais — o resultado é o mesmo.',
      )
    } finally {
      setLendo(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <FileScan size={18} className="mt-0.5 shrink-0 text-navy" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">Importar da DIRPF (PDF)</h3>
          <p className="mt-1 text-xs text-ink-muted">
            O arquivo é lido <strong className="font-semibold text-ink">no seu navegador</strong> e
            descartado — nada é enviado nem armazenado. Só os 6 sinais que você confirmar abaixo
            entram no sistema.
          </p>
          <input
            type="file"
            accept="application/pdf"
            disabled={lendo}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) lerPdf(f)
            }}
            className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-navy-soft"
          />
          {lendo && <p className="mt-2 text-sm text-ink-muted">Lendo o PDF…</p>}
          {erro && <p className="mt-2 text-sm font-medium text-red-600">{erro}</p>}

          {ex && (
            <form action={action} className="mt-4 rounded-lg border border-line bg-surface/60 p-4">
              <input type="hidden" name="id" value={radarId} />
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Confira e ajuste — a extração automática é aproximada
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="ex_imoveis">Nº de imóveis</Label>
                  <input id="ex_imoveis" name="n_imoveis" type="number" min="0" defaultValue={ex.n_imoveis} className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="ex_patrimonio">Patrimônio declarado (R$)</Label>
                  <input id="ex_patrimonio" name="patrimonio" type="number" step="0.01" min="0" defaultValue={ex.patrimonio} className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="ex_aluguel">Aluguéis/ano (R$)</Label>
                  <input id="ex_aluguel" name="renda_aluguel_anual" type="number" step="0.01" min="0" defaultValue={ex.renda_aluguel_anual} className={fieldClass} />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="socio_pj" defaultChecked={ex.socio_pj} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                  Sócio de PJ
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="recebe_dividendos" defaultChecked={ex.recebe_dividendos} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                  Recebe dividendos
                </label>
                <div>
                  <Label htmlFor="ex_herdeiros">Nº de herdeiros</Label>
                  <input id="ex_herdeiros" name="n_herdeiros" type="number" min="0" defaultValue={ex.n_herdeiros} className={fieldClass} />
                </div>
              </div>
              <label className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
                <input type="checkbox" name="lgpd" required className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                <span>
                  <ShieldCheck size={12} className="mr-1 inline text-emerald-600" />
                  Declaro que trato estes dados sob contrato/autorização do titular (LGPD) e estou
                  ciente de que o arquivo não foi armazenado.
                </span>
              </label>
              <button className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft">
                Aplicar sinais confirmados
              </button>
            </form>
          )}
        </div>
      </div>
    </Card>
  )
}
