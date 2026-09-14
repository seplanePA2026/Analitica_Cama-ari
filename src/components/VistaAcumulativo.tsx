import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AcumOpcao, Respondente } from '../types'
import { buildAcumulativo, uniqueValues } from '../lib/acumulativo'
import { COLORS, formatPct, formatVal } from './BarraHorizontal'

type Props = {
  respondentes: Respondente[]
  opcoes: AcumOpcao[]
  regioes: string[]
}

export function VistaAcumulativo({ respondentes, opcoes, regioes }: Props) {
  const defaultId = opcoes.find((o) => o.id === 'gov_est')?.id ?? opcoes[0]?.id ?? ''
  const [perguntaId, setPerguntaId] = useState(defaultId)
  const [regiao, setRegiao] = useState('')
  const [sexo, setSexo] = useState('')

  const sexos = useMemo(() => uniqueValues(respondentes, 'sexo'), [respondentes])
  const opcao = opcoes.find((o) => o.id === perguntaId)

  const result = useMemo(
    () =>
      buildAcumulativo(respondentes, perguntaId, {
        regiao: regiao || undefined,
        sexo: sexo || undefined,
        topN: 3,
      }),
    [respondentes, perguntaId, regiao, sexo],
  )

  const chartSeries = result.series
  const fullSeries = useMemo(() => {
    // table shows top 6 options
    return result.totais.slice(0, 6).map((t) => t.label)
  }, [result.totais])

  const tableAcum = useMemo(() => {
    const r = buildAcumulativo(respondentes, perguntaId, {
      regiao: regiao || undefined,
      sexo: sexo || undefined,
      topN: 6,
    })
    return r
  }, [respondentes, perguntaId, regiao, sexo])

  return (
    <div className="vista vista-acum">
      <div className="acum-card">
        <div className="acum-filters">
          <label>
            Indicador
            <select value={perguntaId} onChange={(e) => setPerguntaId(e.target.value)}>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Região
            <select value={regiao} onChange={(e) => setRegiao(e.target.value)}>
              <option value="">Todas</option>
              {regioes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sexo
            <select value={sexo} onChange={(e) => setSexo(e.target.value)}>
              <option value="">Todos</option>
              {sexos.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="acum-hero">
          <div className="meta">Total acumulado da pesquisa</div>
          <div className="acum-total">{formatVal(result.base)}</div>
          <div className="meta">
            {formatVal(result.top3.reduce((s, t) => s + t.n, 0))} respostas nos {result.top3.length}{' '}
            principais · base {formatVal(result.base)} entrevistas
            {opcao ? ` · ${opcao.title}` : ''}
          </div>
        </div>

        <div className="acum-kpis">
          {result.top3.map((it, i) => (
            <div key={it.label} className="acum-kpi">
              <div className="acum-kpi-name">{it.label}</div>
              <div className="acum-kpi-val" style={{ color: COLORS[i % COLORS.length] }}>
                {formatVal(it.n)}
              </div>
              <div className="meta">{formatPct(it.pct)} do total</div>
            </div>
          ))}
        </div>

        <div className="acum-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.acum} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" />
              <XAxis dataKey="data_label" tick={{ fontSize: 11 }} />
              <YAxis width={44} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e6f3',
                  borderRadius: 12,
                  boxShadow: '0 10px 28px -16px rgba(26,33,64,.35)',
                  opacity: 1,
                }}
                wrapperStyle={{ outline: 'none', zIndex: 20 }}
                formatter={(value, name) => [formatVal(Number(value)), String(name)]}
                labelFormatter={(l) => `Data ${l}`}
              />
              <Legend />
              {chartSeries.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.4}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="tbl acum-table">
          <table>
            <thead>
              <tr>
                <th>Candidato / resposta</th>
                {tableAcum.acum.map((p) => (
                  <th key={p.data}>Acum. {p.data_label}</th>
                ))}
                <th>Total</th>
                <th>% do total</th>
              </tr>
            </thead>
            <tbody>
              {fullSeries.map((s) => {
                const tot = tableAcum.totais.find((t) => t.label === s)
                return (
                  <tr key={s}>
                    <td>{s}</td>
                    {tableAcum.acum.map((p) => (
                      <td key={p.data} className="num">
                        {formatVal(Number(p[s] ?? 0))}
                      </td>
                    ))}
                    <td className="num">{formatVal(tot?.n ?? 0)}</td>
                    <td className="num">{formatPct(tot?.pct ?? 0)}</td>
                  </tr>
                )
              })}
              <tr className="base-row">
                <td>Base (entrevistas)</td>
                {tableAcum.acum.map((p) => (
                  <td key={p.data} className="num">
                    {formatVal(Number(p.base))}
                  </td>
                ))}
                <td className="num">{formatVal(tableAcum.base)}</td>
                <td className="num">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
