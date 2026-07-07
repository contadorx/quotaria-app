import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Minuta } from '@/lib/minutas'

// Gera um PDF limpo (texto) da minuta para enviar ao ZapSign.
// Layout sóbrio: cabeçalho, parágrafos, deliberações numeradas, linhas de assinatura.
export async function minutaParaPdf(m: Minuta): Promise<string> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const W = 595.28, H = 841.89 // A4
  const ML = 64, MR = 64, MT = 72, MB = 72
  const maxW = W - ML - MR
  const navy = rgb(0.07, 0.16, 0.29)
  const ink = rgb(0.1, 0.14, 0.19)

  let page = doc.addPage([W, H])
  let y = H - MT

  const wrap = (text: string, size: number, f = font) => {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(t, size) > maxW && cur) {
        lines.push(cur)
        cur = w
      } else cur = t
    }
    if (cur) lines.push(cur)
    return lines
  }
  const ensure = (need: number) => {
    if (y - need < MB) {
      page = doc.addPage([W, H])
      y = H - MT
    }
  }
  const write = (text: string, opts: { size?: number; f?: typeof font; color?: typeof ink; gap?: number; indent?: number } = {}) => {
    const size = opts.size ?? 10.5
    const f = opts.f ?? font
    const indent = opts.indent ?? 0
    for (const line of wrap(text, size, f)) {
      ensure(size + 4)
      page.drawText(line, { x: ML + indent, y, size, font: f, color: opts.color ?? ink })
      y -= size + 4
    }
    y -= opts.gap ?? 6
  }

  // cabeçalho
  for (const [i, h] of m.cabecalho.entries()) {
    write(h, { size: i === 0 ? 12 : 10.5, f: bold, color: navy, gap: i === m.cabecalho.length - 1 ? 14 : 2 })
  }

  // parágrafos
  for (const p of m.paragrafos) write(p, { size: 10.5, gap: 8 })

  // deliberações
  ensure(20)
  write('Deliberações:', { size: 10.5, f: bold, color: navy, gap: 4 })
  m.deliberacoes.forEach((d, i) => write(`${i + 1}. ${d}`, { size: 10.5, indent: 12, gap: 4 }))

  // fecho
  y -= 6
  write('Nada mais havendo a tratar, lavrou-se a presente ata, que segue assinada pelos sócios.', { size: 10.5, gap: 18 })

  // assinaturas
  ensure(40)
  write('Assinaturas:', { size: 10.5, f: bold, color: navy, gap: 10 })
  for (const a of m.assinantes) {
    ensure(46)
    page.drawLine({ start: { x: ML, y }, end: { x: ML + 260, y }, thickness: 0.8, color: ink })
    y -= 14
    write(a, { size: 9.5, gap: 16 })
  }

  // nota
  y -= 8
  ensure(30)
  write(m.nota, { size: 8, color: rgb(0.42, 0.45, 0.5) })

  const bytes = await doc.save()
  return Buffer.from(bytes).toString('base64')
}
