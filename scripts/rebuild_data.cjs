/**
 * Regenera src/data/resultados.json a partir de 14.09.xlsx
 * (folhas "09 a 13.09" + "14.09") preservando metadados das perguntas.
 */
const fs = require('node:fs')
const path = require('node:path')
const XLSX = require('xlsx')

const root = path.resolve(__dirname, '..')
const srcJson = path.join(root, 'src/data/resultados.json')
const xlsxPath = path.join(root, '14.09.xlsx')
const outBd = path.join(root, 'bd-camacari-resultados.xlsx')

function round1(n) {
  const scaled = n * 10
  const floor = Math.floor(scaled)
  const frac = scaled - floor
  if (frac > 0.5 + 1e-10) return (floor + 1) / 10
  if (frac < 0.5 - 1e-10) return floor / 10
  return floor % 2 === 0 ? floor : floor + 1
}

function pct1(n, base) {
  if (!base) return 0
  return round1((100 * n) / base)
}

function excelSerialToIso(serial) {
  const parsed = XLSX.SSF.parse_date_code(serial)
  if (!parsed) return ''
  return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
}

function parseIsoDate(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return excelSerialToIso(v)
  const s = String(v || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})$/)
  if (m) {
    const months = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
    }
    const mo = months[m[2]]
    if (mo) return `2026-${String(mo).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`
  }
  return ''
}

function isoToLabel(iso) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function wasByCount(items) {
  return items.every((it, i, a) => i === 0 || a[i - 1].n >= it.n)
}

function aggregate(values, ordemPreferida, porQuantidade) {
  const counts = new Map()
  for (const v of values) {
    const s = String(v || '').trim()
    if (!s) continue
    counts.set(s, (counts.get(s) || 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  const ordem = new Map(ordemPreferida.map((l, i) => [l, i]))
  const idx = (l) => (ordem.has(l) ? ordem.get(l) : Number.MAX_SAFE_INTEGER)
  const labels = [...counts.keys()].sort((a, b) => {
    if (porQuantidade) {
      const ca = counts.get(a)
      const cb = counts.get(b)
      if (ca !== cb) return cb - ca
      return idx(a) - idx(b) || a.localeCompare(b, 'pt-BR')
    }
    return idx(a) - idx(b) || a.localeCompare(b, 'pt-BR')
  })
  return {
    total,
    items: labels.map((label) => ({
      label,
      n: counts.get(label),
      pct: pct1(counts.get(label), total),
    })),
  }
}

function buildCruzamento(respondentes, perguntaId, dimId, colunasOrdem) {
  const grupos = new Map()
  for (const r of respondentes) {
    const g = String(r[dimId] || '').trim()
    const v = String(r[perguntaId] || '').trim()
    if (!g || !v) continue
    if (!grupos.has(g)) grupos.set(g, new Map())
    const m = grupos.get(g)
    m.set(v, (m.get(v) || 0) + 1)
  }
  const colunas = [...colunasOrdem]
  for (const m of grupos.values()) {
    for (const k of m.keys()) if (!colunas.includes(k)) colunas.push(k)
  }
  const linhas = [...grupos.entries()]
    .map(([grupo, m]) => {
      const total = [...m.values()].reduce((a, b) => a + b, 0)
      const row = { grupo, total }
      for (const c of colunas) {
        const n = m.get(c) || 0
        row[c] = { n, pct: pct1(n, total) }
      }
      return row
    })
    .sort((a, b) => a.grupo.localeCompare(b.grupo, 'pt-BR'))
  return { colunas, linhas }
}

function buildTracking(respondentes, perguntaId, seriesPreferidas) {
  const byDia = new Map()
  const diaFirstDate = new Map()
  for (const r of respondentes) {
    const dia = String(r.dia || '').trim()
    const v = String(r[perguntaId] || '').trim()
    if (!dia || !v) continue
    if (!byDia.has(dia)) byDia.set(dia, new Map())
    const m = byDia.get(dia)
    m.set(v, (m.get(v) || 0) + 1)
    const prev = diaFirstDate.get(dia)
    if (!prev || r.data < prev) diaFirstDate.set(dia, r.data)
  }
  const dias = [...byDia.keys()].sort((a, b) =>
    String(diaFirstDate.get(a) || '').localeCompare(String(diaFirstDate.get(b) || '')),
  )
  const overall = new Map()
  for (const m of byDia.values()) {
    for (const [k, n] of m) overall.set(k, (overall.get(k) || 0) + n)
  }
  const ranked = [...overall.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const series = (seriesPreferidas?.length ? seriesPreferidas : ranked).filter((s) =>
    ranked.includes(s),
  )
  for (const s of ranked) if (!series.includes(s) && series.length < 6) series.push(s)
  const topSeries = series.slice(0, 6)
  const points = dias.map((dia) => {
    const m = byDia.get(dia)
    const base = [...m.values()].reduce((a, b) => a + b, 0)
    const ponto = { dia }
    for (const s of topSeries) ponto[s] = pct1(m.get(s) || 0, base)
    return ponto
  })
  return { series: topSeries, points }
}

const prev = JSON.parse(fs.readFileSync(srcJson, 'utf8'))
const wb = XLSX.readFile(xlsxPath, { cellDates: false })
const sheetNames = ['09 a 13.09', '14.09'].filter((n) => wb.SheetNames.includes(n))
if (sheetNames.length < 2) {
  console.error('Folhas esperadas não encontradas:', wb.SheetNames)
  process.exit(1)
}

const rawRows = []
for (const name of sheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: true })
  for (const r of rows) rawRows.push(r)
}

const fieldByHeader = new Map(prev.perguntas.map((p) => [p.header, p.id]))
// aliases / exact headers from xlsx
const headerMap = {
  Região: 'regiao',
  dia: 'dia',
  sexo: 'sexo',
  idade: 'idade',
  religião: 'religiao',
  ESCOLARIDADE: 'escolaridade',
  'renda familiar': 'renda',
}
for (const [h, id] of fieldByHeader) headerMap[h] = id

const respondentes = []
const mapa = []
const tabelaRows = []
const tabelaColumns = prev.tabela.columns

for (const row of rawRows) {
  const iso = parseIsoDate(row['Data início'])
  const resp = {
    data: iso,
    data_label: iso ? isoToLabel(iso) : '',
    regiao: String(row['Região'] || '').trim(),
    sexo: String(row['sexo'] || '').trim(),
    idade: String(row['idade'] || '').trim(),
    religiao: String(row['religião'] || '').trim(),
    dia: String(row['dia'] || '').trim(),
    escolaridade: String(row['ESCOLARIDADE'] || '').trim(),
    renda: String(row['renda familiar'] || '').trim(),
  }
  for (const p of prev.perguntas) {
    if (['regiao', 'dia', 'sexo', 'idade', 'religiao', 'escolaridade', 'renda'].includes(p.id)) continue
    const raw = row[p.header]
    resp[p.id] = raw == null ? '' : String(raw).trim()
  }
  // ensure profile fields also as pergunta ids
  resp.regiao = String(row['Região'] || '').trim()
  resp.dia = String(row['dia'] || '').trim()
  resp.sexo = String(row['sexo'] || '').trim()
  resp.idade = String(row['idade'] || '').trim()
  resp.religiao = String(row['religião'] || '').trim()
  resp.escolaridade = String(row['ESCOLARIDADE'] || '').trim()
  resp.renda = String(row['renda familiar'] || '').trim()
  respondentes.push(resp)

  const lat = Number(row['Latitude'])
  const lng = Number(row['Longitude'])
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    mapa.push({
      lat,
      lng,
      regiao: resp.regiao,
      sexo: resp.sexo,
      idade: resp.idade,
    })
  }

  const trow = {}
  for (const c of tabelaColumns) trow[c] = row[c] ?? ''
  // normalize date display for tabela
  if ('dia' in trow) trow.dia = resp.dia
  if ('Região' in trow) trow['Região'] = resp.regiao
  tabelaRows.push(trow)
}

const perguntas = prev.perguntas.map((p) => {
  const values = respondentes.map((r) => r[p.id])
  const porQ = wasByCount(p.items)
  const ordem = p.items.map((i) => i.label)
  const { total, items } = aggregate(values, ordem, porQ)
  const cruzamentos = {}
  for (const dim of prev.cruz_dims) {
    if (dim.id === p.id) continue
    cruzamentos[dim.id] = buildCruzamento(respondentes, p.id, dim.id, items.map((i) => i.label))
  }
  const out = {
    ...p,
    n: total,
    items,
    cruzamentos,
  }
  if (p.tracking) {
    out.tracking = buildTracking(respondentes, p.id, p.tracking.series)
  } else {
    delete out.tracking
  }
  return out
})

const datas = [...new Set(respondentes.map((r) => r.data).filter(Boolean))]
  .sort()
  .map((iso) => ({ iso, label: isoToLabel(iso) }))

const regioes = [...new Set(respondentes.map((r) => r.regiao).filter(Boolean))].sort((a, b) =>
  a.localeCompare(b, 'pt-BR', { numeric: true }),
)

const agora = new Date()
const gerado =
  `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ` +
  `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`

const result = {
  meta: {
    ...prev.meta,
    subtitulo: 'Questionário codificado · coleta 09 a 14/09/2026',
    n_entrevistas: respondentes.length,
    n_perguntas: perguntas.length,
    n_temas: prev.temas.length,
    folha: '09 a 13.09 + 14.09',
    gerado_em: gerado,
    fonte: '14.09.xlsx',
  },
  temas: prev.temas,
  perguntas,
  cruz_dims: prev.cruz_dims,
  tabela: { columns: tabelaColumns, rows: tabelaRows },
  mapa,
  respondentes,
  acum_opcoes: prev.acum_opcoes,
  filtros: { regioes, datas },
}

fs.writeFileSync(srcJson, JSON.stringify(result))
console.log('Wrote', srcJson)
console.log('entrevistas', respondentes.length, 'mapa', mapa.length, 'datas', datas.map((d) => d.iso).join(', '))

// Atualiza planilha local consolidada (folha Resultados)
const exportCols = tabelaColumns
const exportRows = tabelaRows.map((r) => {
  const o = {}
  for (const c of exportCols) o[c] = r[c] ?? ''
  return o
})
const outWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(exportRows), 'Resultados')
XLSX.writeFile(outWb, outBd)
console.log('Wrote', outBd)
