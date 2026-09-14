import type { ResultItem } from '../types'

const COLORS = [
  '#3068c0',
  '#d07e1f',
  '#3a9a72',
  '#8b5cf6',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
]

type Props = {
  items: ResultItem[]
  /** Se omitido, exibe 100% das respostas (sem corte). */
  maxItems?: number
}

export function formatPct(n: number) {
  return `${n.toLocaleString('pt-BR')}%`
}

export function formatVal(n: number) {
  return n.toLocaleString('pt-BR')
}

export function formatPctVal(pct: number, n: number) {
  return `${formatPct(pct)} · ${formatVal(n)}`
}

export function BarraHorizontal({ items, maxItems }: Props) {
  const list = maxItems == null ? items : items.slice(0, maxItems)
  const max = Math.max(...list.map((i) => i.pct), 1)

  return (
    <div className="hbar-list">
      {list.map((it, i) => (
        <div className="hbar-row" key={it.label}>
          <div className="hbar-label" title={it.label}>
            {it.label}
          </div>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{
                width: `${Math.max((it.pct / max) * 100, 8)}%`,
                background: COLORS[i % COLORS.length],
              }}
            >
              <span className="hbar-val">{formatPctVal(it.pct, it.n)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export { COLORS }
