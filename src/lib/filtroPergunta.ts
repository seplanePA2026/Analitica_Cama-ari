import type { Pergunta, Respondente, ResultItem } from '../types'

export type FiltroPergunta = {
  sexo: string
  idade: string
  escolaridade: string
}

export const FILTRO_PERGUNTA_VAZIO: FiltroPergunta = { sexo: '', idade: '', escolaridade: '' }

export const CAMPOS_FILTRO_PERGUNTA: { key: keyof FiltroPergunta; label: string }[] = [
  { key: 'idade', label: 'Faixa etária' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'escolaridade', label: 'Escolaridade' },
]

function pct(n: number, base: number) {
  return base ? Math.round((1000 * n) / base) / 10 : 0
}

/** Recalcula resultados e linha por dia da pergunta só com os entrevistados que passam no filtro. */
export function filtrarPergunta(p: Pergunta, rows: Respondente[], f: FiltroPergunta): Pergunta {
  const sel = rows.filter(
    (r) => (!f.sexo || r.sexo === f.sexo) && (!f.idade || r.idade === f.idade) && (!f.escolaridade || r.escolaridade === f.escolaridade),
  )

  const counts = new Map<string, number>()
  for (const r of sel) {
    const v = r[p.id]
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((s, n) => s + n, 0)

  // mantém o critério de ordem da pergunta original: por quantidade (desc) ou na ordem das categorias
  const ordem = new Map(p.items.map((it, i) => [it.label, i]))
  const porQuantidade = p.items.every((it, i, a) => i === 0 || a[i - 1].n >= it.n)
  const idx = (l: string) => ordem.get(l) ?? Number.MAX_SAFE_INTEGER
  const labels = [...counts.keys()].sort((a, b) => {
    if (porQuantidade && counts.get(a) !== counts.get(b)) return counts.get(b)! - counts.get(a)!
    return idx(a) - idx(b) || a.localeCompare(b, 'pt-BR')
  })
  const items: ResultItem[] = labels.map((label) => ({ label, n: counts.get(label)!, pct: pct(counts.get(label)!, total) }))

  let tracking = p.tracking
  if (p.tracking) {
    const series = p.tracking.series
    tracking = {
      series,
      points: p.tracking.points.map((pt) => {
        const doDia = sel.filter((r) => r.dia === pt.dia && r[p.id])
        const ponto: Record<string, string | number> = { dia: pt.dia }
        if (doDia.length) {
          for (const s of series) ponto[s] = pct(doDia.filter((r) => r[p.id] === s).length, doDia.length)
        }
        return ponto
      }),
    }
  }

  return { ...p, n: total, items, tracking }
}
