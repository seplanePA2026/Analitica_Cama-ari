import type { ResultItem } from '../types'
import { bairrosDaRegiao, rotuloRegiaoCompleto, subtituloRegiao } from '../data/regioes_bairros'
import { formatPct, formatPctVal, formatVal, COLORS } from './BarraHorizontal'

type Props = {
  items: ResultItem[]
}

function ordemRegiao(label: string) {
  const n = Number(label.replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 99
}

/** Bloco do relatório para "Região da entrevista": nome oficial + lista de bairros. */
export function RegiaoRelatorioBlock({ items }: Props) {
  const list = [...items].sort((a, b) => ordemRegiao(a.label) - ordemRegiao(b.label))
  const max = Math.max(...list.map((i) => i.pct), 1)

  return (
    <div className="rel-regioes">
      {list.map((it, i) => {
        const sub = subtituloRegiao(it.label)
        const bairros = bairrosDaRegiao(it.label)
        return (
          <div className="rel-regiao-item" key={it.label}>
            <div className="hbar-row rel-regiao-hbar">
              <div className="hbar-label" title={rotuloRegiaoCompleto(it.label)}>
                <strong>{it.label}</strong>
                {sub ? <span className="rel-regiao-sub"> · {sub}</span> : null}
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
            <div className="rel-regiao-bairros">
              <div className="rel-regiao-bairros-title">
                Bairros ({bairros.length})
              </div>
              {bairros.length ? (
                <p className="rel-regiao-bairros-lista">{bairros.join(' · ')}</p>
              ) : (
                <p className="meta">Lista de bairros não cadastrada para esta região.</p>
              )}
            </div>
          </div>
        )
      })}

      <div className="tbl compact rel-regiao-tbl">
        <table>
          <thead>
            <tr>
              <th>Região</th>
              <th>Nome</th>
              <th>Valor</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {list.map((it) => (
              <tr key={`t-${it.label}`}>
                <td>{it.label}</td>
                <td>{subtituloRegiao(it.label) || '—'}</td>
                <td className="num">{formatVal(it.n)}</td>
                <td className="num">{formatPct(it.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
