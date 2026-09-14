import type { Pergunta, Respondente, ResultItem } from '../types'

export type RelatorioFiltros = {
  sexo: string
  idade: string
  religiao: string
  escolaridade: string
  renda: string
  regiao: string
}

export const FILTROS_VAZIOS: RelatorioFiltros = {
  sexo: '',
  idade: '',
  religiao: '',
  escolaridade: '',
  renda: '',
  regiao: '',
}

export function filtrosAtivos(f: RelatorioFiltros) {
  return Object.values(f).some(Boolean)
}

export function filterRespondentes(rows: Respondente[], f: RelatorioFiltros) {
  return rows.filter((r) => {
    if (f.sexo && r.sexo !== f.sexo) return false
    if (f.idade && r.idade !== f.idade) return false
    if (f.religiao && r.religiao !== f.religiao) return false
    if (f.escolaridade && r.escolaridade !== f.escolaridade) return false
    if (f.renda && r.renda !== f.renda) return false
    if (f.regiao && r.regiao !== f.regiao) return false
    return true
  })
}

function aggregateField(rows: Respondente[], field: string): ResultItem[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const v = r[field]
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((s, n) => s + n, 0) || 1
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => ({
      label,
      n,
      pct: Math.round((1000 * n) / total) / 10,
    }))
}

export function perguntasComFiltro(
  base: Pergunta[],
  rows: Respondente[],
  f: RelatorioFiltros,
): { perguntas: Pergunta[]; n: number } {
  const filtered = filterRespondentes(rows, f)
  if (!filtrosAtivos(f)) {
    return { perguntas: base, n: rows.length }
  }
  const perguntas = base.map((p) => {
    const items = aggregateField(filtered, p.id)
    return {
      ...p,
      n: items.reduce((s, it) => s + it.n, 0),
      items,
      // keep original cruzamentos structure empty-safe — hide detailed cruz when filtered
      cruzamentos: p.cruzamentos,
    }
  })
  return { perguntas, n: filtered.length }
}

export function uniqueSorted(rows: Respondente[], key: keyof RelatorioFiltros | string) {
  const set = new Set<string>()
  for (const r of rows) {
    const v = r[key]
    if (v) set.add(v)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
