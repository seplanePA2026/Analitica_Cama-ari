import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffect } from 'react'
import type { Pergunta } from '../types'
import { COLORS, formatPct, formatPctVal, formatVal } from './BarraHorizontal'

type Modo = 'graf' | 'linha' | 'tabela'

type Props = {
  pergunta: Pergunta
  modo: Modo
  onModo: (m: Modo) => void
}

function leitura(p: Pergunta): string {
  if (!p.items.length) return 'Sem respostas válidas nesta pergunta.'
  const top = p.items[0]
  const segundo = p.items[1]
  if (!segundo) {
    return `${top.label} concentra ${formatPctVal(top.pct, top.n)} das respostas.`
  }
  return `${top.label} lidera com ${formatPctVal(top.pct, top.n)}, seguido de ${segundo.label} com ${formatPctVal(segundo.pct, segundo.n)}.`
}

function shortLabel(label: string, max = 28) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

export function ResultadoPanel({ pergunta, modo, onModo }: Props) {
  const top3 = pergunta.items.slice(0, 3)
  const hasTracking = Boolean(pergunta.tracking?.points?.length)
  const chartData = pergunta.items.map((it) => ({
    ...it,
    nome: shortLabel(it.label),
    labelFull: formatPctVal(it.pct, it.n),
  }))

  useEffect(() => {
    if (modo === 'linha' && !hasTracking) onModo('graf')
  }, [modo, hasTracking, onModo])

  return (
    <section className="col main" id="main" tabIndex={-1}>
      <div>
        <div className="eyebrow">{pergunta.tema}</div>
        <h2>{pergunta.title}</h2>
        <p className="leitura">{leitura(pergunta)}</p>
      </div>

      <div className="kpis">
        {top3.map((it, i) => (
          <div key={it.label} className={`kpi${i === 0 ? ' lead' : ''}`}>
            <div className="l">{i === 0 ? '1º colocado' : `${i + 1}º`}</div>
            <div className="v">{formatPct(it.pct)}</div>
            <div className="d">
              {formatVal(it.n)} · {it.label}
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <span className="meta" style={{ margin: 0 }}>
          Visualização
        </span>
        <div className="tog" role="group" aria-label="Modo de visualização">
          <button type="button" aria-pressed={modo === 'graf'} onClick={() => onModo('graf')}>
            Barras
          </button>
          {hasTracking && (
            <button type="button" aria-pressed={modo === 'linha'} onClick={() => onModo('linha')}>
              Linha (dias)
            </button>
          )}
          <button type="button" aria-pressed={modo === 'tabela'} onClick={() => onModo('tabela')}>
            Tabela
          </button>
        </div>
      </div>

      <div className="viz">
        {modo === 'graf' && (
          <div className="chart" role="img" aria-label="Distribuição percentual">
            {pergunta.chart === 'donut' && pergunta.items.length <= 8 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="pct"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="66%"
                    paddingAngle={2}
                    label={(props) => {
                      const pct = Number(props.percent ?? 0) * 100
                      const n = Number(props.payload?.n ?? 0)
                      return formatPctVal(Number(pct.toFixed(1)), n)
                    }}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_value, _name, item) => [
                      formatPctVal(Number(item.payload.pct), Number(item.payload.n)),
                      item.payload.label,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 8, right: 88, top: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="var(--grid)" horizontal={false} />
                  <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(_value, _name, item) => [
                      formatPctVal(Number(item.payload.pct), Number(item.payload.n)),
                      'Resultado',
                    ]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                  />
                  <Bar dataKey="pct" radius={[0, 8, 8, 0]} maxBarSize={22}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="labelFull"
                      position="right"
                      style={{ fontSize: 11, fill: '#4b5474' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {modo === 'linha' && hasTracking && pergunta.tracking && (
          <div className="chart chart-line" role="img" aria-label="Evolução diária da coleta">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pergunta.tracking.points} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--grid)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e6f3',
                    borderRadius: 12,
                    boxShadow: '0 10px 28px -16px rgba(26,33,64,.35)',
                    opacity: 1,
                    padding: '10px 12px',
                  }}
                  wrapperStyle={{ outline: 'none', zIndex: 20 }}
                  itemStyle={{ color: '#1a2140' }}
                  labelStyle={{ color: '#1a2140', fontWeight: 700, marginBottom: 4 }}
                  formatter={(value) => formatPct(Number(value))}
                />
                <Legend />
                {pergunta.tracking.series.map((s, i) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2.2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {modo === 'tabela' && (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Resposta</th>
                  <th>Valor</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {pergunta.items.map((it, i) => (
                  <tr key={it.label} className={i === 0 ? 'top' : undefined}>
                    <td>{it.label}</td>
                    <td className="num">{formatVal(it.n)}</td>
                    <td className="num">{formatPct(it.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
