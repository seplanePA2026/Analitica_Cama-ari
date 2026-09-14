import type { ResultItem } from '../types'

export type Respondente = {
  data: string
  data_label: string
  regiao: string
  sexo: string
  idade: string
  religiao: string
  [key: string]: string
}

export type AcumFiltros = {
  perguntaId: string
  regiao: string // '' = todas
  sexo: string
  topN: number
}

export type AcumPoint = Record<string, string | number> & {
  data: string
  data_label: string
  base: number
}

export type AcumResult = {
  series: string[]
  daily: AcumPoint[]
  acum: AcumPoint[]
  totais: ResultItem[]
  base: number
  top3: ResultItem[]
}

export function buildAcumulativo(
  rows: Respondente[],
  perguntaId: string,
  opts: { regiao?: string; sexo?: string; topN?: number } = {},
): AcumResult {
  const topN = opts.topN ?? 3
  let filtered = rows
  if (opts.regiao) filtered = filtered.filter((r) => r.regiao === opts.regiao)
  if (opts.sexo) filtered = filtered.filter((r) => r.sexo === opts.sexo)

  const byDate = new Map<string, Respondente[]>()
  for (const r of filtered) {
    if (!r.data) continue
    const list = byDate.get(r.data) ?? []
    list.push(r)
    byDate.set(r.data, list)
  }
  const dates = [...byDate.keys()].sort()

  // overall totals for ranking
  const overall = new Map<string, number>()
  for (const r of filtered) {
    const v = r[perguntaId]
    if (!v) continue
    overall.set(v, (overall.get(v) ?? 0) + 1)
  }
  const ranked = [...overall.entries()].sort((a, b) => b[1] - a[1])
  const series = ranked.slice(0, Math.max(topN, 6)).map(([k]) => k)
  const topSeries = ranked.slice(0, topN).map(([k]) => k)
  const base = [...overall.values()].reduce((s, n) => s + n, 0) || 1

  const totais: ResultItem[] = ranked.map(([label, n]) => ({
    label,
    n,
    pct: round1((100 * n) / base),
  }))
  const top3 = totais.slice(0, topN)

  const daily: AcumPoint[] = []
  const acum: AcumPoint[] = []
  const running = new Map<string, number>()
  let runningBase = 0

  for (const d of dates) {
    const dayRows = byDate.get(d) ?? []
    const dayCount = new Map<string, number>()
    let dayBase = 0
    for (const r of dayRows) {
      const v = r[perguntaId]
      if (!v) continue
      dayBase += 1
      dayCount.set(v, (dayCount.get(v) ?? 0) + 1)
    }
    const label = dayRows[0]?.data_label ?? d
    const dPoint: AcumPoint = { data: d, data_label: label, base: dayBase }
    for (const s of series) dPoint[s] = dayCount.get(s) ?? 0
    daily.push(dPoint)

    runningBase += dayBase
    for (const s of series) {
      running.set(s, (running.get(s) ?? 0) + (dayCount.get(s) ?? 0))
    }
    const aPoint: AcumPoint = { data: d, data_label: label, base: runningBase }
    for (const s of series) aPoint[s] = running.get(s) ?? 0
    acum.push(aPoint)
  }

  return {
    series: topSeries.length ? topSeries : series.slice(0, topN),
    daily,
    acum,
    totais,
    base: [...overall.values()].reduce((s, n) => s + n, 0),
    top3,
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function uniqueValues(rows: Respondente[], key: keyof Respondente | string): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    const v = r[key as string]
    if (v) set.add(v)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
