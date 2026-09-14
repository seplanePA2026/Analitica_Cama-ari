import { useMemo, useState } from 'react'
import type { TabelaData } from '../types'
import { tabelaResultadosOnly } from '../lib/export'

type Props = {
  tabela: TabelaData
  titulo: string
  hideToolbarExport?: boolean
}

export function VistaTabela({ tabela }: Props) {
  const clean = useMemo(() => tabelaResultadosOnly(tabela), [tabela])
  const [q, setQ] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const pageSize = 40

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let rows = clean.rows
    if (term) {
      rows = rows.filter((r) =>
        clean.columns.some((c) => String(r[c] ?? '').toLowerCase().includes(term)),
      )
    }
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol]
        const bv = b[sortCol]
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av
        }
        const as = String(av ?? '')
        const bs = String(bv ?? '')
        return sortDir === 'asc' ? as.localeCompare(bs, 'pt-BR') : bs.localeCompare(as, 'pt-BR')
      })
    }
    return rows
  }, [clean, q, sortCol, sortDir])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const slice = filtered.slice(page * pageSize, page * pageSize + pageSize)

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  return (
    <div className="vista vista-tabela">
      <div className="vista-toolbar">
        <input
          className="search"
          placeholder="Filtrar em todas as colunas…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
        />
        <span className="meta">{filtered.length.toLocaleString('pt-BR')} linhas</span>
      </div>

      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="sticky">#</th>
              {clean.columns.map((c) => (
                <th key={c} onClick={() => toggleSort(c)} title="Ordenar">
                  {c}
                  {sortCol === c ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={page * pageSize + i}>
                <td className="sticky num">{page * pageSize + i + 1}</td>
                {clean.columns.map((c) => (
                  <td key={c}>{String(r[c] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <span>
          Página {page + 1} de {pages}
        </span>
        <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
          Próxima
        </button>
      </div>
    </div>
  )
}
