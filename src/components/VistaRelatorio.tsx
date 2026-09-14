import { useRef } from 'react'
import type { CruzDim, Pergunta } from '../types'
import { BarraHorizontal, formatPct, formatVal } from './BarraHorizontal'
import { CruzamentoPanel } from './CruzamentoPanel'

const TEMA_SEM_CRUZAMENTO = 'Perfil do entrevistado'

type Props = {
  perguntas: Pergunta[]
  temas: string[]
  dims: CruzDim[]
  titulo: string
  hideToolbarExport?: boolean
  contentRef?: React.RefObject<HTMLDivElement | null>
  filteredN?: number
  baseN?: number
  filtrosAtivos?: boolean
}

export function VistaRelatorio({
  perguntas,
  temas,
  dims,
  contentRef,
  filteredN,
  baseN,
  filtrosAtivos = false,
}: Props) {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = contentRef ?? localRef

  const byTema = temas.map((t) => ({
    tema: t,
    items: perguntas.filter((p) => p.tema === t),
  }))

  return (
    <div className="vista vista-relatorio">
      <div className="vista-toolbar no-print">
        <span className="meta">
          Relatório completo na ordem da pesquisa
          {typeof filteredN === 'number' && typeof baseN === 'number' && (
            <>
              {' · '}
              {filtrosAtivos
                ? `${filteredN.toLocaleString('pt-BR')} de ${baseN.toLocaleString('pt-BR')} entrevistas`
                : `${baseN.toLocaleString('pt-BR')} entrevistas`}
            </>
          )}
        </span>
      </div>

      <div className="relatorio-scroll" ref={ref}>
        {byTema.map(({ tema, items }) => (
          <section key={tema} className="rel-tema">
            <h2 className="rel-tema-title">{tema}</h2>
            <div className="rel-grid">
              {items.map((p) => (
                <article key={p.id} className="rel-card">
                  <h3>{p.title}</h3>
                  <BarraHorizontal items={p.items} />
                  <div className="tbl compact">
                    <table>
                      <thead>
                        <tr>
                          <th>Resposta</th>
                          <th>Valor</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((it) => (
                          <tr key={it.label}>
                            <td title={it.label}>{it.label}</td>
                            <td className="num">{formatVal(it.n)}</td>
                            <td className="num">{formatPct(it.pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {tema !== TEMA_SEM_CRUZAMENTO && !filtrosAtivos && (
                    <CruzamentoPanel pergunta={p} dims={dims} />
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
