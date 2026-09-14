import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CruzDim, CruzCell, Pergunta } from '../types'
import { formatPctVal } from './BarraHorizontal'

type Props = {
  pergunta: Pergunta
  dims: CruzDim[]
}

function isCell(v: unknown): v is CruzCell {
  return Boolean(v) && typeof v === 'object' && 'pct' in (v as object) && 'n' in (v as object)
}

export function CruzamentoPanel({ pergunta, dims }: Props) {
  const available = useMemo(
    () => dims.filter((d) => d.id !== pergunta.id && pergunta.cruzamentos[d.id]),
    [dims, pergunta],
  )
  const [open, setOpen] = useState(false)
  const [dimId, setDimId] = useState(available[0]?.id ?? '')

  useEffect(() => {
    if (!available.some((d) => d.id === dimId)) {
      setDimId(available[0]?.id ?? '')
    }
  }, [available, dimId, pergunta.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!available.length) return null

  const cruz = pergunta.cruzamentos[dimId]
  const dimLabel = available.find((d) => d.id === dimId)?.label ?? ''

  const modal = open
    ? createPortal(
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cruz-title-${pergunta.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id={`cruz-title-${pergunta.id}`}>Cruzamentos</h3>
                <p className="meta">{pergunta.title}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="modal-dims">
              <span className="meta">Cruzar por</span>
              <div className="dim-grid">
                {available.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="dim-chip"
                    aria-pressed={dimId === d.id}
                    onClick={() => setDimId(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {cruz && (
              <div className="modal-table-wrap">
                <div className="meta" style={{ marginBottom: 8 }}>
                  Resultado × {dimLabel}
                </div>
                <table className="cruz-table">
                  <thead>
                    <tr>
                      <th>{dimLabel}</th>
                      {cruz.colunas.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cruz.linhas.map((row) => (
                      <tr key={row.grupo}>
                        <td className="grupo">{row.grupo}</td>
                        {cruz.colunas.map((c) => {
                          const cell = row[c]
                          if (!isCell(cell)) return <td key={c}>—</td>
                          return (
                            <td key={c} className="num">
                              {formatPctVal(cell.pct, cell.n)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div className="cruz-actions no-print">
      <button type="button" className="cruz-btn" onClick={() => setOpen(true)}>
        Abrir cruzamentos
      </button>
      {modal}
    </div>
  )
}
