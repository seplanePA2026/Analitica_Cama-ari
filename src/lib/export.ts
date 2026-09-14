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

export function exportRelatorioExcel(perguntas: Pergunta[], filename = 'relatorio-camacari.xlsx') {
  const wb = XLSX.utils.book_new()
  const resumo = perguntas.map((p) => ({
    Tema: p.tema,
    Pergunta: p.title,
    '1º': p.items[0]?.label ?? '',
    Valor: p.items[0]?.n ?? '',
    '%': p.items[0]?.pct ?? '',
    '2º': p.items[1]?.label ?? '',
    'Valor 2': p.items[1]?.n ?? '',
    '% 2': p.items[1]?.pct ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo')

  for (const p of perguntas) {
    const name = p.title.slice(0, 28).replace(/[\\/?*[\]]/g, '')
    const rows = p.items.map((it) => ({ Resposta: it.label, Quantidade: it.n, Percentual: it.pct }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name || p.id)
  }
  XLSX.writeFile(wb, filename)
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/analitica-logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
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
  const logo = await loadLogoDataUrl()

  // Cover / header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
  doc.rect(0, 0, pageW, 28, 'F')
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', marginX, 7, 42, 14)
    } catch {
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Analítica', marginX, 17)
    }
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Analítica', marginX, 17)
  }

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
    `${meta.n_entrevistas} entrevistas · Gerado em ${meta.gerado_em} · Resultados agregados`,
    marginX,
    y,
  )
  y += 8

  let currentTema = ''
  for (const p of perguntas) {
    const items = p.items.slice(0, 10)
    const barBlock = Math.min(items.length, 8) * 6 + 8
    const tableBlock = (Math.min(items.length, 8) + 1) * 6 + 6
    const cardNeed = 12 + barBlock + tableBlock + 8

    y = ensureSpace(doc, y, cardNeed, pageH, footerReserve)

    if (p.tema !== currentTema) {
      currentTema = p.tema
      y = ensureSpace(doc, y, 10, pageH, footerReserve)
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

    // Card background
    const cardTop = y - 2
    const cardH = cardNeed - 2
    doc.setFillColor(250, 250, 253)
    doc.setDrawColor(LINE.r, LINE.g, LINE.b)
    doc.roundedRect(marginX - 1, cardTop, contentW + 2, cardH, 2, 2, 'FD')

    y += 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(INK.r, INK.g, INK.b)
    const titleLines = doc.splitTextToSize(p.title, contentW - 4)
    doc.text(titleLines, marginX + 2, y)
    y += titleLines.length * 4.2 + 2

    const maxPct = Math.max(...items.map((i) => i.pct), 1)
    const barMaxW = contentW - 58
    for (let i = 0; i < Math.min(items.length, 8); i++) {
      const it = items[i]
      const c = CHART_COLORS[i % CHART_COLORS.length]
      const label = it.label.length > 22 ? `${it.label.slice(0, 21)}…` : it.label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(INK.r, INK.g, INK.b)
      doc.text(label, marginX + 2, y + 2.8)

      const bw = Math.max(4, (it.pct / maxPct) * barMaxW)
      doc.setFillColor(c[0], c[1], c[2])
      doc.roundedRect(marginX + 48, y, bw, 4, 1, 1, 'F')
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
      doc.text(`${it.pct.toFixed(1).replace('.', ',')}% · ${it.n}`, marginX + 50 + bw + 1.5, y + 3)
      y += 6
    }

    y += 2
    autoTable(doc, {
      startY: y,
      margin: { left: marginX + 1, right: marginX + 1 },
      head: [['Resposta', 'Valor', '%']],
      body: items.slice(0, 8).map((it) => [
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
      },
      headStyles: {
        fillColor: [BRAND.r, BRAND.g, BRAND.b],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 18 },
      },
      theme: 'grid',
      tableWidth: contentW - 2,
    })
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, pageW, pageH, logo, i, totalPages)
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
  const logo = await loadLogoDataUrl()

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
  doc.rect(0, 0, pageW, 48, 'F')
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 28, 12, 90, 28)
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(meta.titulo, 140, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(meta.subtitulo, 140, 40)

  const cols = clean.columns.slice(0, 16)
  autoTable(doc, {
    startY: 60,
    head: [cols],
    body: clean.rows.map((r) => cols.map((c) => String(r[c] ?? ''))),
    styles: { fontSize: 6.5, cellPadding: 2, textColor: [INK.r, INK.g, INK.b] },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 247, 255] },
  })

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const y = pageH - 18
    doc.setDrawColor(LINE.r, LINE.g, LINE.b)
    doc.line(28, y - 8, pageW - 28, y - 8)
    doc.setFontSize(8)
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.text('Analítica · Resultados da pesquisa', 28, y)
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
  // kept for compatibility — prefer branded exporters
  const doc = new jsPDF()
  doc.text('Use o exportador institucional do painel.', 14, 20)
  doc.save(filename)
}
