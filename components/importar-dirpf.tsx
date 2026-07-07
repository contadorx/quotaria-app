'use client'

import { useState } from 'react'
import { FileScan, ShieldCheck, AlertTriangle, X, Heart } from 'lucide-react'
import { Card, Label, fieldClass } from '@/components/ui'
import { PendingButton } from '@/components/submit-button'

type Declaracao = {
  arquivo: string
  nome: string
  cpf: string | null
  cpfConjuge: string | null
  conjunta: boolean
  n_imoveis: number
  patrimonio: number
  renda_aluguel_anual: number
  socio_pj: boolean
  recebe_dividendos: boolean
  filhosCpfs: string[]
  filhosSemCpf: number
}

const RE_CPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/g
const RE_MOEDA = /\d{1,3}(?:\.\d{3})*,\d{2}/g

function parseBRL(str: string): number {
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0
}

function mascara(cpf: string | null): string {
  if (!cpf) return '—'
  return `***.***.${cpf.slice(8)}`
}

function extrairDeclaracao(textoBruto: string, arquivo: string): Declaracao {
  const t = textoBruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

  // declarante: primeiro CPF + nome próximo de "NOME"
  const cpfs = t.match(RE_CPF) ?? []
  const cpf = cpfs[0] ?? null
  let nome = arquivo.replace(/\.pdf$/i, '')
  const mNome = t.match(/NOME[:\s]+([A-Z][A-Z\s]{4,60}?)(?:\s{2,}|CPF|DATA|\n)/)
  if (mNome) nome = mNome[1].trim()

  // cônjuge: CPF (≠ declarante) próximo de CONJUGE/COMPANHEIR
  let cpfConjuge: string | null = null
  const iConj = t.search(/CONJUGE|COMPANHEIR/)
  if (iConj >= 0) {
    const viz = t.slice(iConj, iConj + 300)
    const c = (viz.match(RE_CPF) ?? []).find((x) => x !== cpf)
    if (c) cpfConjuge = c
  }
  const conjunta = /EM CONJUNTO/.test(t)

  // imóveis (Grupo 01)
  const gImoveis = t.match(/GRUPO[:\s]*0?1\b/g)?.length ?? 0
  const n_imoveis = gImoveis > 0 ? gImoveis : Math.max(0, (t.match(/BENS IMOVEIS/g)?.length ?? 1) - 1)

  // patrimônio: maior último valor de linhas TOTAL
  let patrimonio = 0
  for (const linha of t.match(/TOTAL[^\n]{0,120}/g) ?? []) {
    const vals = linha.match(RE_MOEDA)
    if (vals?.length) patrimonio = Math.max(patrimonio, parseBRL(vals[vals.length - 1]))
  }

  // aluguéis: maior valor perto de ALUGU
  let renda_aluguel_anual = 0
  let idx = t.indexOf('ALUGU')
  while (idx !== -1) {
    for (const v of t.slice(idx, idx + 200).match(RE_MOEDA) ?? []) {
      renda_aluguel_anual = Math.max(renda_aluguel_anual, parseBRL(v))
    }
    idx = t.indexOf('ALUGU', idx + 1)
  }

  const socio_pj = /GRUPO[:\s]*0?3\b|PARTICIPACOES SOCIETARIAS|QUOTAS OU QUINHOES/.test(t)
  const recebe_dividendos = /LUCROS E DIVIDENDOS/.test(t)

  // filhos dependentes: CPFs únicos no trecho DEPENDENTES (dedupe entre declarações)
  const filhosCpfs: string[] = []
  let filhosSemCpf = 0
  const iDep = t.indexOf('DEPENDENTES')
  if (iDep >= 0) {
    const trecho = t.slice(iDep, iDep + 5000)
    let j = trecho.search(/FILH[OA]/)
    while (j !== -1) {
      const viz = trecho.slice(j, j + 160)
      const c = (viz.match(RE_CPF) ?? []).find((x) => x !== cpf && x !== cpfConjuge)
      if (c) filhosCpfs.push(c)
      else filhosSemCpf++
      const prox = trecho.slice(j + 1).search(/FILH[OA]/)
      j = prox === -1 ? -1 : j + 1 + prox
    }
  }

  return {
    arquivo, nome, cpf, cpfConjuge, conjunta,
    n_imoveis, patrimonio, renda_aluguel_anual, socio_pj, recebe_dividendos,
    filhosCpfs: Array.from(new Set(filhosCpfs)), filhosSemCpf,
  }
}

function consolidar(decls: Declaracao[]) {
  const filhosUnicos = new Set<string>()
  let filhosSemCpf = 0
  for (const d of decls) {
    d.filhosCpfs.forEach((c) => filhosUnicos.add(c))
    filhosSemCpf += d.filhosSemCpf
  }
  return {
    n_imoveis: decls.reduce((a, d) => a + d.n_imoveis, 0),
    patrimonio: decls.reduce((a, d) => a + d.patrimonio, 0),
    renda_aluguel_anual: decls.reduce((a, d) => a + d.renda_aluguel_anual, 0),
    socio_pj: decls.some((d) => d.socio_pj),
    recebe_dividendos: decls.some((d) => d.recebe_dividendos),
    n_herdeiros: filhosUnicos.size + filhosSemCpf,
  }
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
  const [decls, setDecls] = useState<Declaracao[]>([])

  async function lerPdfs(files: FileList) {
    setLendo(true)
    setErro('')
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      const novas: Declaracao[] = []
      for (const file of Array.from(files)) {
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
        let texto = ''
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p)
          const tc = await page.getTextContent()
          texto += tc.items.map((i) => ('str' in i ? i.str : '')).join(' ') + '\n'
        }
        novas.push(extrairDeclaracao(texto, file.name))
      }
      setDecls((prev) => {
        const cpfsPrev = new Set(prev.map((d) => d.cpf).filter(Boolean))
        return [...prev, ...novas.filter((n) => !n.cpf || !cpfsPrev.has(n.cpf))]
      })
    } catch (e) {
      setErro(
        'Não consegui ler algum dos PDFs' +
          (e instanceof Error ? ` (${e.message})` : '') +
          '. Use a entrada manual — o resultado é o mesmo.',
      )
    } finally {
      setLendo(false)
    }
  }

  const cpfsDeclarantes = new Set(decls.map((d) => d.cpf).filter(Boolean) as string[])
  const conjugesFaltantes = decls.filter(
    (d) => d.cpfConjuge && !cpfsDeclarantes.has(d.cpfConjuge) && !d.conjunta,
  )
  const cons = consolidar(decls)
  const composicao =
    decls.length > 0
      ? `Consolidado de ${decls.length} declaração(ões): ${decls.map((d) => d.nome.split(' ')[0]).join(' + ')} · ${cons.n_herdeiros} filho(s) único(s) como herdeiros`
      : ''
  const chave = decls.map((d) => d.cpf ?? d.arquivo).join('|')

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <FileScan size={18} className="mt-0.5 shrink-0 text-navy" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">Importar as DIRPFs da família (PDF)</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Envie a declaração do titular <strong className="font-semibold text-ink">e do cônjuge</strong> —
            o sistema cruza os CPFs, unifica os filhos dependentes e consolida o patrimônio da família.
            Tudo é lido <strong className="font-semibold text-ink">no seu navegador</strong> e descartado:
            nenhum arquivo ou CPF é enviado ou armazenado.
          </p>
          <input
            type="file"
            accept="application/pdf"
            multiple
            disabled={lendo}
            onChange={(e) => {
              if (e.target.files?.length) lerPdfs(e.target.files)
              e.target.value = ''
            }}
            className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-navy-soft"
          />
          {lendo && <p className="mt-2 text-sm text-ink-muted">Lendo…</p>}
          {erro && <p className="mt-2 text-sm font-medium text-red-600">{erro}</p>}

          {decls.length > 0 && (
            <>
              {/* declarações lidas */}
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-white">
                {decls.map((d, i) => {
                  const conjugeEncontrado = d.cpfConjuge && cpfsDeclarantes.has(d.cpfConjuge)
                  return (
                    <li key={i} className="flex items-start gap-2 px-4 py-2.5 text-xs">
                      <div className="flex-1">
                        <div className="font-semibold text-ink">
                          {d.nome} <span className="font-normal text-ink-soft">· CPF {mascara(d.cpf)}</span>
                        </div>
                        <div className="mt-0.5 text-ink-muted">
                          {d.n_imoveis} imóveis · patrimônio {d.patrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} · aluguéis {d.renda_aluguel_anual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}/ano
                          {d.filhosCpfs.length + d.filhosSemCpf > 0 ? ` · ${d.filhosCpfs.length + d.filhosSemCpf} filho(s) dependente(s)` : ''}
                        </div>
                        {d.conjunta && <div className="mt-0.5 text-ink-soft">declaração em conjunto (cônjuge já incluído)</div>}
                        {d.cpfConjuge && !d.conjunta && (
                          <div className={`mt-0.5 inline-flex items-center gap-1 ${conjugeEncontrado ? 'text-emerald-700' : 'text-amber-700'}`}>
                            <Heart size={11} />
                            cônjuge CPF {mascara(d.cpfConjuge)} {conjugeEncontrado ? '— declaração enviada ✓' : '— declaração NÃO enviada'}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDecls((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded p-1 text-ink-soft transition hover:bg-surface hover:text-red-600"
                        aria-label="Remover"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* avisos */}
              {conjugesFaltantes.length > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Falta a declaração do cônjuge de{' '}
                    {conjugesFaltantes.map((d) => d.nome.split(' ')[0]).join(', ')} — o patrimônio da
                    família pode estar <strong className="font-semibold">subestimado</strong>. Peça o PDF e adicione aqui.
                  </span>
                </p>
              )}
              {decls.length > 1 && (
                <p className="mt-2 text-[11px] text-ink-soft">
                  Casais podem declarar os <em>mesmos</em> bens nas duas declarações (comunhão) — se for o
                  caso, ajuste o total abaixo antes de aplicar.
                </p>
              )}

              {/* consolidado editável */}
              <form key={chave} action={action} className="mt-4 rounded-lg border border-line bg-surface/60 p-4">
                <input type="hidden" name="id" value={radarId} />
                <input type="hidden" name="notes" value={composicao} />
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Consolidado da família — confira e ajuste
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="ex_imoveis">Nº de imóveis</Label>
                    <input id="ex_imoveis" name="n_imoveis" type="number" min="0" defaultValue={cons.n_imoveis} className={fieldClass} />
                  </div>
                  <div>
                    <Label htmlFor="ex_patrimonio">Patrimônio (R$)</Label>
                    <input id="ex_patrimonio" name="patrimonio" type="number" step="0.01" min="0" defaultValue={cons.patrimonio} className={fieldClass} />
                  </div>
                  <div>
                    <Label htmlFor="ex_aluguel">Aluguéis/ano (R$)</Label>
                    <input id="ex_aluguel" name="renda_aluguel_anual" type="number" step="0.01" min="0" defaultValue={cons.renda_aluguel_anual} className={fieldClass} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="socio_pj" defaultChecked={cons.socio_pj} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                    Sócio de PJ
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="recebe_dividendos" defaultChecked={cons.recebe_dividendos} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                    Recebe dividendos
                  </label>
                  <div>
                    <Label htmlFor="ex_herdeiros">Herdeiros (filhos únicos)</Label>
                    <input id="ex_herdeiros" name="n_herdeiros" type="number" min="0" defaultValue={cons.n_herdeiros} className={fieldClass} />
                  </div>
                </div>
                <label className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
                  <input type="checkbox" name="lgpd" required className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                  <span>
                    <ShieldCheck size={12} className="mr-1 inline text-emerald-600" />
                    Declaro que trato estes dados sob contrato/autorização dos titulares (LGPD) e estou
                    ciente de que os arquivos e CPFs não foram armazenados.
                  </span>
                </label>
                <PendingButton className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft">
                  Aplicar consolidado da família
                </PendingButton>
              </form>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
