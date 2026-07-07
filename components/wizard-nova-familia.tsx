'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, Search, Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { fieldClass, Label, SubmitButton } from '@/components/ui'
import { criarFamiliaGuiada } from '@/app/app/actions'
import { mascaraDocumento, apenasDigitos, cnpjValido } from '@/lib/documento'
import { LABEL_PAPEL_FAMILIAR, LABEL_TIPO_DIREITO } from '@/lib/format'

type Socio = { nome: string; cpf: string; papel_familiar: string }
type QuotaLinha = { percentual: string; tipo_direito: string }

const PASSOS = ['Família', 'Sócios', 'Holding', 'Quotas']

export function WizardNovaFamilia() {
  const [passo, setPasso] = useState(0)

  const [nome, setNome] = useState('')
  const [notes, setNotes] = useState('')
  const [socios, setSocios] = useState<Socio[]>([{ nome: '', cpf: '', papel_familiar: '' }])

  const [temHolding, setTemHolding] = useState(true)
  const [razao, setRazao] = useState('')
  const [fantasia, setFantasia] = useState('')
  const [tipo, setTipo] = useState('ltda')
  const [cnpj, setCnpj] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [feedbackCnpj, setFeedbackCnpj] = useState('')

  // quotas: uma linha por sócio (percentual + tipo)
  const [quotas, setQuotas] = useState<Record<number, QuotaLinha>>({})

  const sociosValidos = socios.filter((s) => s.nome.trim())
  const digitos = apenasDigitos(cnpj)

  async function buscarCnpj() {
    if (digitos.length !== 14 || !cnpjValido(digitos)) {
      setFeedbackCnpj('CNPJ inválido.')
      return
    }
    setBuscando(true)
    setFeedbackCnpj('')
    try {
      const r = await fetch(`/api/cnpj/${digitos}`)
      const d = await r.json()
      if (!r.ok) { setFeedbackCnpj(d.erro ?? 'Não encontrado.'); return }
      if (d.razaoSocial) setRazao(d.razaoSocial)
      if (d.nomeFantasia) setFantasia(d.nomeFantasia)
      setFeedbackCnpj(d.municipio ? `Encontrado · ${d.municipio}/${d.uf}` : 'Preenchido.')
    } catch {
      setFeedbackCnpj('Sem conexão com a Receita. Preencha manualmente.')
    } finally {
      setBuscando(false)
    }
  }

  const somaPct = useMemo(
    () => sociosValidos.reduce((a, _s, i) => a + (Number(quotas[i]?.percentual) || 0), 0),
    [quotas, sociosValidos],
  )

  const payload = useMemo(() => {
    const idxMap: number[] = []
    socios.forEach((s, i) => { if (s.nome.trim()) idxMap.push(i) })
    const sociosLimpos = sociosValidos.map((s) => ({ nome: s.nome.trim(), cpf: s.cpf.trim(), papel_familiar: s.papel_familiar }))
    const quotasLimpas = sociosValidos
      .map((_s, i) => ({ socioIndex: i, percentual: quotas[i]?.percentual ?? '', tipo_direito: quotas[i]?.tipo_direito ?? 'plena' }))
      .filter((q) => q.percentual !== '')
    return JSON.stringify({
      familia: { name: nome.trim(), notes: notes.trim() },
      socios: sociosLimpos,
      holding: temHolding && razao.trim() ? { razao_social: razao.trim(), nome_fantasia: fantasia.trim(), tipo_societario: tipo, cnpj: digitos } : null,
      quotas: temHolding && razao.trim() ? quotasLimpas : [],
    })
  }, [nome, notes, socios, sociosValidos, temHolding, razao, fantasia, tipo, digitos, quotas])

  const podeAvancar =
    (passo === 0 && nome.trim().length > 0) ||
    (passo === 1) ||
    (passo === 2) ||
    passo === 3

  return (
    <div>
      {/* trilha de passos */}
      <div className="mb-6 flex items-center gap-2">
        {PASSOS.map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < passo ? 'bg-emerald-600 text-white' : i === passo ? 'bg-navy text-white' : 'bg-line text-ink-soft'}`}>
              {i < passo ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-sm ${i === passo ? 'font-semibold text-navy' : 'text-ink-soft'}`}>{p}</span>
            {i < PASSOS.length - 1 && <span className="mx-1 h-px w-6 bg-line" />}
          </div>
        ))}
      </div>

      {/* PASSO 1 — FAMÍLIA */}
      {passo === 0 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="w_nome">Nome da família</Label>
            <input id="w_nome" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex.: Família Andrade" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="w_notes">Observações (opcional)</Label>
            <textarea id="w_notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={fieldClass} />
          </div>
        </div>
      )}

      {/* PASSO 2 — SÓCIOS */}
      {passo === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Adicione os sócios da família. Você pode ajustar tudo depois.</p>
          {socios.map((s, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <Label htmlFor={`w_snome_${i}`}>Nome</Label>
                <input id={`w_snome_${i}`} value={s.nome} onChange={(e) => setSocios((a) => a.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} placeholder="Ex.: José Andrade" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor={`w_scpf_${i}`}>CPF</Label>
                <input id={`w_scpf_${i}`} value={s.cpf} onChange={(e) => setSocios((a) => a.map((x, j) => j === i ? { ...x, cpf: mascaraDocumento(e.target.value) } : x))} placeholder="000.000.000-00" inputMode="numeric" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor={`w_spapel_${i}`}>Papel</Label>
                <select id={`w_spapel_${i}`} value={s.papel_familiar} onChange={(e) => setSocios((a) => a.map((x, j) => j === i ? { ...x, papel_familiar: e.target.value } : x))} className={fieldClass}>
                  <option value="">—</option>
                  {Object.entries(LABEL_PAPEL_FAMILIAR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => setSocios((a) => a.filter((_, j) => j !== i))} disabled={socios.length === 1} className="rounded-lg border border-line p-2 text-ink-soft transition hover:text-red-600 disabled:opacity-40">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setSocios((a) => [...a, { nome: '', cpf: '', papel_familiar: '' }])} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-navy transition hover:border-gold">
            <Plus size={15} /> Adicionar sócio
          </button>
        </div>
      )}

      {/* PASSO 3 — HOLDING */}
      {passo === 2 && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={temHolding} onChange={(e) => setTemHolding(e.target.checked)} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
            Cadastrar uma holding agora (você pode adicionar depois)
          </label>
          {temHolding && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="w_cnpj">CNPJ (consulte para preencher)</Label>
                <div className="flex gap-2">
                  <input id="w_cnpj" value={cnpj} onChange={(e) => { setCnpj(mascaraDocumento(e.target.value)); setFeedbackCnpj('') }} placeholder="00.000.000/0001-00" inputMode="numeric" className={fieldClass} />
                  <button type="button" onClick={buscarCnpj} disabled={buscando || digitos.length !== 14} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-navy transition hover:border-gold disabled:opacity-50">
                    {buscando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
                  </button>
                </div>
                {feedbackCnpj && <p className="mt-1 text-xs text-ink-soft">{feedbackCnpj}</p>}
              </div>
              <div>
                <Label htmlFor="w_razao">Razão social</Label>
                <input id="w_razao" value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="Ex.: Andrade Participações Ltda" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="w_fantasia">Nome fantasia</Label>
                <input id="w_fantasia" value={fantasia} onChange={(e) => setFantasia(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="w_tipo">Tipo</Label>
                <select id="w_tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={fieldClass}>
                  <option value="ltda">Ltda</option>
                  <option value="sa">S/A</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PASSO 4 — QUOTAS */}
      {passo === 3 && (
        <div className="space-y-4">
          {!temHolding || !razao.trim() ? (
            <p className="text-sm text-ink-muted">Sem holding neste cadastro — as quotas ficam para quando você criar a holding. Pode concluir.</p>
          ) : sociosValidos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum sócio informado — volte ao passo Sócios se quiser atribuir quotas.</p>
          ) : (
            <>
              <p className="text-sm text-ink-muted">Atribua a participação de cada sócio (opcional). Usufruto não soma no total.</p>
              {sociosValidos.map((s, i) => (
                <div key={i} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_auto_auto]">
                  <span className="text-sm font-medium text-ink">{s.nome}</span>
                  <div>
                    <Label htmlFor={`w_qpct_${i}`}>%</Label>
                    <input id={`w_qpct_${i}`} type="number" step="0.0001" min="0" max="100" value={quotas[i]?.percentual ?? ''} onChange={(e) => setQuotas((q) => ({ ...q, [i]: { percentual: e.target.value, tipo_direito: q[i]?.tipo_direito ?? 'plena' } }))} placeholder="50" className={`${fieldClass} w-28`} />
                  </div>
                  <div>
                    <Label htmlFor={`w_qtipo_${i}`}>Direito</Label>
                    <select id={`w_qtipo_${i}`} value={quotas[i]?.tipo_direito ?? 'plena'} onChange={(e) => setQuotas((q) => ({ ...q, [i]: { percentual: q[i]?.percentual ?? '', tipo_direito: e.target.value } }))} className={`${fieldClass} w-44`}>
                      {Object.entries(LABEL_TIPO_DIREITO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <div className={`rounded-lg border px-4 py-2 text-sm ${Math.abs(somaPct - 100) < 0.01 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-line bg-surface text-ink-muted'}`}>
                Soma das participações: <strong>{somaPct.toLocaleString('pt-BR')}%</strong>{Math.abs(somaPct - 100) < 0.01 ? ' — fecha 100% ✓' : ''}
              </div>
            </>
          )}
        </div>
      )}

      {/* navegação */}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        <button type="button" onClick={() => setPasso((p) => Math.max(0, p - 1))} disabled={passo === 0} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink disabled:opacity-0">
          <ArrowLeft size={15} /> Voltar
        </button>
        {passo < PASSOS.length - 1 ? (
          <button type="button" onClick={() => setPasso((p) => p + 1)} disabled={!podeAvancar} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-50">
            Continuar <ArrowRight size={15} />
          </button>
        ) : (
          <form>
            <input type="hidden" name="payload" value={payload} />
            <SubmitButton action={criarFamiliaGuiada}>Criar família</SubmitButton>
          </form>
        )}
      </div>
    </div>
  )
}
