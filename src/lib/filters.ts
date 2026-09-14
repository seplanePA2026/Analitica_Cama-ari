import type { Pergunta, Respondente, ResultItem } from '../types'
import { pct1 } from './pct'

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

/**
 * Agrega respostas.
 * - Se a pergunta original era por quantidade → ranking por n.
 * - Se era por categorias (idade, avaliação…) → mantém a ordem original.
 */
function aggregateField(
  rows: Respondente[],
  field: string,
  ordemOriginal: string[],
  porQuantidade: boolean,
): ResultItem[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const v = r[field]
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((s, n) => s + n, 0)
  const ordem = new Map(ordemOriginal.map((l, i) => [l, i]))
  const idx = (l: string) => ordem.get(l) ?? Number.MAX_SAFE_INTEGER

  const labels = [...counts.keys()].sort((a, b) => {
    if (porQuantidade) {
      const ca = counts.get(a)!
      const cb = counts.get(b)!
      if (ca !== cb) return cb - ca
      return idx(a) - idx(b) || a.localeCompare(b, 'pt-BR')
    }
    return idx(a) - idx(b) || a.localeCompare(b, 'pt-BR')
  })

  return labels.map((label) => ({
    label,
    n: counts.get(label)!,
    pct: pct1(counts.get(label)!, total),
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
    const ordemOriginal = p.items.map((it) => it.label)
    const porQuantidade = p.items.every((it, i, a) => i === 0 || a[i - 1].n >= it.n)
    const items = aggregateField(filtered, p.id, ordemOriginal, porQuantidade)
    return {
      ...p,
      n: items.reduce((s, it) => s + it.n, 0),
      items,
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
