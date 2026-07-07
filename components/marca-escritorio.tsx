/* eslint-disable @next/next/no-img-element */
// Cabeçalho de documento voltado ao cliente — carrega a marca do ESCRITÓRIO,
// não a do Quotaria. É o que torna o diagnóstico e o relatório peças de conversão:
// o cliente vê a análise do contador dele.

export function MarcaEscritorio({
  nome,
  crc,
  logoUrl,
  corPrimaria,
  titulo,
  subtitulo,
  meta,
}: {
  nome: string | null
  crc: string | null
  logoUrl: string | null
  corPrimaria: string | null
  titulo: string
  subtitulo?: string
  meta?: React.ReactNode
}) {
  const cor = corPrimaria || '#12284B'
  return (
    <header className="border-b-2 pb-5" style={{ borderColor: cor }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={nome ?? 'Escritório'} className="mb-2 h-9 w-auto object-contain" />
          ) : (
            <p className="text-sm font-bold uppercase tracking-wide" style={{ color: cor }}>
              {nome ?? 'Seu escritório'}
            </p>
          )}
          <p className="text-[11px] text-ink-soft">
            {logoUrl && nome ? `${nome} · ` : ''}Gestão Patrimonial e Sucessória
            {crc ? ` · CRC ${crc}` : ''}
          </p>
        </div>
      </div>
      <h1 className="mt-3 text-2xl font-extrabold" style={{ color: cor }}>{titulo}</h1>
      {subtitulo && <p className="mt-1 text-sm text-ink-muted">{subtitulo}</p>}
      {meta && <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">{meta}</div>}
    </header>
  )
}

// Assinatura de rodapé com a marca do escritório.
export function AssinaturaEscritorio({ nome, crc }: { nome: string | null; crc: string | null }) {
  return (
    <div className="mt-8 border-t border-line pt-4">
      <p className="text-sm text-ink">_______________________________________</p>
      <p className="mt-1 text-sm font-semibold text-ink">
        {nome ?? '[escritório]'}{crc ? ` · CRC ${crc}` : ''}
      </p>
      <p className="text-xs text-ink-soft">Contador responsável</p>
    </div>
  )
}
