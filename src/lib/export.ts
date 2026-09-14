import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Pergunta, TabelaData } from '../types'

const BRAND = { r: 136, g: 88, b: 240 }
const INK = { r: 26, g: 33, b: 64 }
const MUTED = { r: 138, g: 146, b: 174 }
const LINE = { r: 226, g: 230, b: 243 }

const EXPORT_SKIP = [
  'autor',
  'data início',
  'data inicio',
  'latitude',
  'longitude',
  'nome',
  'endereço',
  'endereco',
  'bairro',
  'telefone',
  'audios_urls',
]

const CHART_COLORS = [
  [48, 104, 192],
  [208, 126, 31],
  [58, 154, 114],
  [139, 92, 246],
  [219, 39, 119],
  [8, 145, 178],
  [101, 163, 13],
  [234, 88, 12],
]

function resultColumns(columns: string[]) {
  return columns.filter((c) => !EXPORT_SKIP.includes(c.trim().toLowerCase()))
}

export function tabelaResultadosOnly(tabela: TabelaData): TabelaData {
  const columns = resultColumns(tabela.columns)
  return {
    columns,
    rows: tabela.rows.map((r) => {
      const out: Record<string, string | number> = {}
      for (const c of columns) out[c] = r[c] ?? ''
      return out
    }),
  }
}

export function exportTabelaExcel(tabela: TabelaData, filename = 'tracking-camacari.xlsx') {
  const clean = tabelaResultadosOnly(tabela)
  const ws = XLSX.utils.json_to_sheet(
    clean.rows.map((r) => {
      const out: Record<string, string | number> = {}
      for (const c of clean.columns) out[c] = r[c] ?? ''
      return out
    }),
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados')
  XLSX.writeFile(wb, filename)
}

function uniqueSheetName(base: string, used: Set<string>) {
  let name = base.slice(0, 31).replace(/[\\/?*[\]]/g, '') || 'Pergunta'
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  let i = 2
  while (i < 100) {
    const suffix = ` (${i})`
    const clipped = `${name.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
    if (!used.has(clipped)) {
      used.add(clipped)
      return clipped
    }
    i++
  }
  const fallback = `Pergunta ${used.size + 1}`.slice(0, 31)
  used.add(fallback)
  return fallback
}

export function exportRelatorioExcel(perguntas: Pergunta[], filename = 'relatorio-camacari.xlsx') {
  const wb = XLSX.utils.book_new()
  const used = new Set<string>(['Resumo'])
  const resumo = perguntas.map((p) => {
    const ranked = [...p.items].sort((a, b) => b.n - a.n || b.pct - a.pct)
    return {
      Tema: p.tema,
      Pergunta: p.title,
      '1º': ranked[0]?.label ?? '',
      Valor: ranked[0]?.n ?? '',
      '%': ranked[0]?.pct ?? '',
      '2º': ranked[1]?.label ?? '',
      'Valor 2': ranked[1]?.n ?? '',
      '% 2': ranked[1]?.pct ?? '',
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo')

  for (const p of perguntas) {
    const name = uniqueSheetName(p.title, used)
    const rows = p.items.map((it) => ({ Resposta: it.label, Quantidade: it.n, Percentual: it.pct }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name)
  }
  XLSX.writeFile(wb, filename)
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

/** Logo roxa original (ok em fundo claro). */
async function loadLogoPurpleDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/analitica-logo.png')
    if (!res.ok) return null
    return await blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}

/** Recolore pixels opacos para branco — legível na barra roxa do PDF. */
function recolorLogoWhite(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imageData.data
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 8) {
            d[i] = 255
            d[i + 1] = 255
            d[i + 2] = 255
          }
        }
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.crossOrigin = 'anonymous'
    img.src = dataUrl
  })
}

async function loadLogoVariants(): Promise<{ purple: string | null; white: string | null }> {
  const purple = await loadLogoPurpleDataUrl()
  const white = purple ? await recolorLogoWhite(purple) : null
  return { purple, white }
}

function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  logo: string | null,
  page: number,
  total: number,
) {
  const y = pageH - 10
  doc.setDrawColor(LINE.r, LINE.g, LINE.b)
  doc.setLineWidth(0.3)
  doc.line(14, y - 4, pageW - 14, y - 4)

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, y - 2.2, 18, 6)
    } catch {
      /* ignore */
    }
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text('Analítica · Pesquisas de opinião pública e de mercado', pageW / 2, y + 1.5, {
    align: 'center',
  })
  doc.text(`${page} / ${total}`, pageW - 14, y + 1.5, { align: 'right' })
}

function ensureSpace(doc: jsPDF, y: number, need: number, pageH: number, marginBottom: number) {
  if (y + need <= pageH - marginBottom) return y
  doc.addPage()
  return 18
}

function drawHeaderBar(
  doc: jsPDF,
  pageW: number,
  logoWhite: string | null,
  heightMm: number,
  marginX: number,
  logoW: number,
  logoH: number,
  logoY: number,
) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
  doc.rect(0, 0, pageW, heightMm, 'F')
  if (logoWhite) {
    try {
      doc.addImage(logoWhite, 'PNG', marginX, logoY, logoW, logoH)
      return
    } catch {
      /* fall through */
    }
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Analítica', marginX, heightMm * 0.62)
}

/**
 * Relatório PDF com 100% das respostas, sem cards com altura fixa
 * (evita vazamento/corte em qualquer navegador — jsPDF é vetorial).
 */
export async function exportRelatorioPdfBranded(
  perguntas: Pergunta[],
  meta: { titulo: string; subtitulo: string; n_entrevistas: number; gerado_em: string },
  filename = 'relatorio-camacari.pdf',
) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 14
  const contentW = pageW - marginX * 2
  const footerReserve = 16
  const { purple: logoPurple, white: logoWhite } = await loadLogoVariants()

  drawHeaderBar(doc, pageW, logoWhite, 28, marginX, 42, 14, 7)

  let y = 38
  doc.setTextColor(INK.r, INK.g, INK.b)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(meta.titulo, marginX, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text(meta.subtitulo, marginX, y)
  y += 5
  doc.text(
    `${meta.n_entrevistas} entrevistas · Gerado em ${meta.gerado_em} · Resultados agregados · lista completa`,
    marginX,
    y,
  )
  y += 10

  let currentTema = ''
  for (const p of perguntas) {
    const items = p.items
    const titleLines = doc.splitTextToSize(p.title, contentW - 4)
    const titleH = titleLines.length * 4.2 + 2
    // Reserva mínima: tema (se novo) + título + 1 barra — o restante quebra de página linha a linha
    const introNeed = (p.tema !== currentTema ? 12 : 0) + titleH + 10
    y = ensureSpace(doc, y, introNeed, pageH, footerReserve)

    if (p.tema !== currentTema) {
      currentTema = p.tema
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
      doc.text(currentTema.toUpperCase(), marginX, y)
      y += 5
      doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b)
      doc.setLineWidth(0.4)
      doc.line(marginX, y, marginX + 36, y)
      y += 5
    }

    // Marcador de bloco (sem retângulo de altura fixa — nunca corta conteúdo)
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b)
    doc.setLineWidth(0.6)
    doc.line(marginX - 1, y - 1, marginX - 1, y + titleH + 2)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(INK.r, INK.g, INK.b)
    doc.text(titleLines, marginX + 2, y)
    y += titleH

    const maxPct = Math.max(...items.map((i) => i.pct), 1)
    const labelColW = 62
    const barMaxW = contentW - labelColW - 28

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const labelLines = doc.splitTextToSize(it.label, labelColW - 2)
      const rowH = Math.max(6, labelLines.length * 3.4 + 1.5)
      y = ensureSpace(doc, y, rowH + 1, pageH, footerReserve)

      const c = CHART_COLORS[i % CHART_COLORS.length]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(INK.r, INK.g, INK.b)
      doc.text(labelLines, marginX + 2, y + 2.6)

      const bw = Math.max(3, (it.pct / maxPct) * barMaxW)
      const barY = y + (rowH - 4) / 2
      doc.setFillColor(c[0], c[1], c[2])
      doc.roundedRect(marginX + labelColW, barY, bw, 4, 1, 1, 'F')
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
      doc.setFontSize(7)
      doc.text(
        `${it.pct.toFixed(1).replace('.', ',')}% · ${it.n}`,
        marginX + labelColW + bw + 1.5,
        barY + 3,
      )
      y += rowH
    }

    y += 2
    y = ensureSpace(doc, y, 14, pageH, footerReserve)

    autoTable(doc, {
      startY: y,
      margin: { left: marginX + 1, right: marginX + 1, bottom: footerReserve },
      head: [['Resposta', 'Valor', '%']],
      body: items.map((it) => [
        it.label,
        String(it.n),
        `${it.pct.toFixed(1).replace('.', ',')}%`,
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 1.4,
        textColor: [INK.r, INK.g, INK.b],
        lineColor: [LINE.r, LINE.g, LINE.b],
        lineWidth: 0.1,
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      headStyles: {
        fillColor: [BRAND.r, BRAND.g, BRAND.b],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: contentW - 40 },
        1: { halign: 'right', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 18 },
      },
      theme: 'grid',
      tableWidth: contentW - 2,
      rowPageBreak: 'auto',
      showHead: 'everyPage',
    })
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, pageW, pageH, logoPurple, i, totalPages)
  }

  doc.save(filename)
}

export async function exportTabelaPdfBranded(
  tabela: TabelaData,
  meta: { titulo: string; subtitulo: string },
  filename = 'tabela-camacari.pdf',
) {
  const clean = tabelaResultadosOnly(tabela)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const { purple: logoPurple, white: logoWhite } = await loadLogoVariants()

  drawHeaderBar(doc, pageW, logoWhite, 48, 28, 90, 28, 12)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(meta.titulo, 140, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(meta.subtitulo, 140, 40)

  const cols = clean.columns
  autoTable(doc, {
    startY: 60,
    margin: { left: 28, right: 28, bottom: 36 },
    head: [cols],
    body: clean.rows.map((r) => cols.map((c) => String(r[c] ?? ''))),
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      textColor: [INK.r, INK.g, INK.b],
      overflow: 'linebreak',
    },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 247, 255] },
    rowPageBreak: 'auto',
    showHead: 'everyPage',
  })

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const y = pageH - 18
    doc.setDrawColor(LINE.r, LINE.g, LINE.b)
    doc.line(28, y - 8, pageW - 28, y - 8)
    if (logoPurple) {
      try {
        doc.addImage(logoPurple, 'PNG', 28, y - 6, 36, 12)
      } catch {
        /* ignore */
      }
    }
    doc.setFontSize(8)
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.text('Analítica · Resultados da pesquisa', 72, y)
    doc.text(`${i} / ${totalPages}`, pageW - 28, y, { align: 'right' })
  }

  doc.save(filename)
}

/** @deprecated use exportRelatorioPdfBranded */
export async function exportElementPdf(
  _el: HTMLElement,
  filename: string,
  _title?: string,
) {
  const doc = new jsPDF()
  doc.text('Use o exportador institucional do painel.', 14, 20)
  doc.save(filename)
}
