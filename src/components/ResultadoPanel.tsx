import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Curve,
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
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Pergunta, Respondente } from '../types'
import {
  CAMPOS_FILTRO_PERGUNTA,
  FILTRO_PERGUNTA_VAZIO,
  filtrarPergunta,
  type FiltroPergunta,
} from '../lib/filtroPergunta'
import { uniqueSorted } from '../lib/filters'
import { COLORS, formatPct, formatPctVal, formatVal } from './BarraHorizontal'

type Modo = 'graf' | 'linha' | 'tabela'

type Props = {
  pergunta: Pergunta
  respondentes: Respondente[]
  modo: Modo
  onModo: (m: Modo) => void
}

function leitura(p: Pergunta): string {
  if (!p.items.length) return 'Sem respostas válidas nesta pergunta.'
  const ranked = [...p.items].sort((a, b) => b.n - a.n || b.pct - a.pct)
  const top = ranked[0]
  const segundo = ranked[1]
  if (!segundo) {
    return `${top.label} concentra ${formatPctVal(top.pct, top.n)} das respostas.`
  }
  if (top.n === segundo.n) {
    return `${top.label} e ${segundo.label} empatam com ${formatPctVal(top.pct, top.n)}.`
  }
  return `${top.label} lidera com ${formatPctVal(top.pct, top.n)}, seguido de ${segundo.label} com ${formatPctVal(segundo.pct, segundo.n)}.`
}


const ROTULO_MAX_PX = 240
const LINHA_PX = 13
const FONTE_PX = 11
const FONTE_MIN_PX = 9.5
const EIXO_X_PX = 46
// Mede com um <text> SVG real (mesma renderização dos rótulos do gráfico)
let textoMedida: SVGTextElement | null = null
function larguraTexto(texto: string) {
  if (!textoMedida) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden;visibility:hidden'
    textoMedida = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textoMedida.setAttribute('font-size', '11')
    svg.appendChild(textoMedida)
    document.body.appendChild(svg)
  }
  textoMedida.textContent = texto
  return textoMedida.getComputedTextLength()
}

function quebraRotulo(label: string, maxPx: number) {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of label.split(/\s+/).filter(Boolean)) {
    if (atual && larguraTexto(`${atual} ${palavra}`) > maxPx) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

type TickProps = { x?: number | string; y?: number | string; payload?: { value?: string } }

function TickRotulo({ x = 0, y = 0, payload, maxPx, escala }: TickProps & { maxPx: number; escala: number }) {
  const linhas = quebraRotulo(String(payload?.value ?? ''), maxPx)
  const linha = LINHA_PX * escala
  const topo = -((linhas.length - 1) * linha) / 2 + 4 * escala
  return (
    <text x={Number(x)} y={Number(y)} textAnchor="end" fill="#666" fontSize={FONTE_PX * escala}>
      {linhas.map((l, i) => (
        <tspan key={i} x={Number(x) - 4} dy={i === 0 ? topo : linha}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

export function ResultadoPanel({ pergunta: perguntaBase, respondentes, modo, onModo }: Props) {
  const [filtro, setFiltro] = useState<FiltroPergunta>(FILTRO_PERGUNTA_VAZIO)
  const opcoesFiltro = useMemo(
    () => ({
      sexo: uniqueSorted(respondentes, 'sexo'),
      idade: uniqueSorted(respondentes, 'idade'),
      escolaridade: uniqueSorted(respondentes, 'escolaridade'),
    }),
    [respondentes],
  )
  // o filtro da própria variável da pergunta (ex.: Sexo em "Sexo do entrevistado") não se aplica
  const camposFiltro = CAMPOS_FILTRO_PERGUNTA.filter((c) => c.key !== perguntaBase.id)
  const filtroEfetivo = useMemo(() => {
    const f = { ...FILTRO_PERGUNTA_VAZIO }
    for (const c of camposFiltro) f[c.key] = filtro[c.key]
    return f
  }, [filtro, perguntaBase.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const pergunta = useMemo(
    () =>
      Object.values(filtroEfetivo).some(Boolean)
        ? filtrarPergunta(perguntaBase, respondentes, filtroEfetivo)
        : perguntaBase,
    [perguntaBase, respondentes, filtroEfetivo],
  )
  const top3 = [...pergunta.items].sort((a, b) => b.n - a.n || b.pct - a.pct).slice(0, 3)
  const hasTracking = Boolean(pergunta.tracking?.points?.length)
  // Região da entrevista: gráfico e tabela na ordem Região 1 → 5 (cards e leitura seguem pelo maior valor)
  const itensExibidos =
    pergunta.id === 'regiao'
      ? [...pergunta.items].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }))
      : pergunta.items
  const chartData = itensExibidos.map((it) => ({
    ...it,
    nome: it.label,
    labelFull: formatPctVal(it.pct, it.n),
  }))

  // nomes ocultos nos gráficos de linha e rosca (clique na legenda); zera ao trocar de pergunta ou de modo
  const chaveOcultas = `${pergunta.id}:${modo}`
  const [ocultasEstado, setOcultasEstado] = useState<{ id: string; nomes: string[] }>({ id: '', nomes: [] })
  const ocultas = ocultasEstado.id === chaveOcultas ? ocultasEstado.nomes : []
  function alternaSerie(nome: string) {
    setOcultasEstado({
      id: chaveOcultas,
      nomes: ocultas.includes(nome) ? ocultas.filter((n) => n !== nome) : [...ocultas, nome],
    })
  }

  // remede quando a fonte terminar de carregar
  const [, setFontesProntas] = useState(false)
  useEffect(() => {
    document.fonts?.ready.then(() => setFontesProntas(true))
  }, [])

  // largura dos rótulos = maior linha já quebrada; eixo X termina no maior valor
  const rotulos = pergunta.items.map((it) => quebraRotulo(it.label, ROTULO_MAX_PX))
  // altura livre da área do gráfico: a letra encolhe (até FONTE_MIN_PX) para caber sem rolar a página
  const vizRef = useRef<HTMLDivElement>(null)
  const [vizAltura, setVizAltura] = useState(0)
  useEffect(() => {
    const el = vizRef.current
    if (!el) return
    const ro = new ResizeObserver(([entrada]) => setVizAltura(Math.round(entrada.contentRect.height / 8) * 8))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const alturaBase = rotulos.reduce((s, l) => s + l.length * LINHA_PX + 3, 0)
  const escala =
    vizAltura > 0
      ? Math.round(Math.min(1, Math.max(FONTE_MIN_PX / FONTE_PX, (vizAltura - EIXO_X_PX) / alturaBase)) * 20) / 20
      : 1
  const eixoY = Math.ceil(Math.max(40, ...rotulos.flat().map(larguraTexto)) * escala) + 12
  // mínimo compacto no desktop (gráfico cresce até ocupar o espaço livre); mais folgado no celular
  const alturaMinima = Math.ceil(EIXO_X_PX + (alturaBase * FONTE_MIN_PX) / FONTE_PX)
  const alturaMinimaMobile = 24 + rotulos.reduce((s, l) => s + l.length * LINHA_PX + 16, 0)
  const margemDireita = Math.ceil(Math.max(0, ...chartData.map((d) => larguraTexto(d.labelFull))) * escala) + 14
  const maxPct = Math.max(0.1, ...pergunta.items.map((it) => it.pct))
  const passo = [1, 2, 5, 10, 15, 20, 25].find((p) => maxPct / p <= 5) ?? 25
  const ticksX = Array.from({ length: Math.floor(maxPct / passo) + 1 }, (_, i) => i * passo)

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
        {camposFiltro.map(({ key, label }) => (
          <select
            key={key}
            className={`toolbar-filtro${filtro[key] ? ' ativo' : ''}`}
            aria-label={label}
            value={filtro[key]}
            onChange={(e) => setFiltro({ ...filtro, [key]: e.target.value })}
          >
            <option value="">{label}</option>
            {opcoesFiltro[key].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ))}
        <button
          type="button"
          className="filter-clear toolbar-limpar"
          disabled={!camposFiltro.some((c) => filtro[c.key])}
          onClick={() => setFiltro(FILTRO_PERGUNTA_VAZIO)}
        >
          Limpar
        </button>
      </div>

      <div className="viz" ref={vizRef}>
        {modo === 'graf' && (
          <div
            className="chart"
            role="img"
            aria-label="Distribuição percentual"
            style={
              pergunta.chart === 'donut' && pergunta.items.length <= 8
                ? undefined
                : ({
                    '--chart-min': `${alturaMinima}px`,
                    '--chart-min-mobile': `${Math.max(280, alturaMinimaMobile)}px`,
                  } as CSSProperties)
            }
          >
            {pergunta.chart === 'donut' && pergunta.items.length <= 8 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.map((d) => ({ ...d, valor: ocultas.includes(d.label) ? 0 : d.pct }))}
                    dataKey="valor"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="66%"
                    paddingAngle={2}
                    labelLine={(props) => {
                      const { key, ...resto } = props as typeof props & { key?: string }
                      return ocultas.includes(String(props.payload?.label)) ? (
                        <g key={key} />
                      ) : (
                        <Curve key={key} {...resto} type="linear" className="recharts-pie-label-line" />
                      )
                    }}
                    label={(props) => {
                      if (ocultas.includes(String(props.payload?.label))) return null
                      // % sobre o total de todas as respostas (ocultar uma fatia não recalcula as demais)
                      const somaPct = chartData.reduce((s, d) => s + d.pct, 0) || 1
                      const pct = (Number(props.payload?.pct ?? 0) / somaPct) * 100
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
                  <Legend
                    wrapperStyle={{ cursor: 'pointer' }}
                    onClick={(e) => alternaSerie(String(e.value))}
                    formatter={(value) => (
                      <span
                        style={
                          ocultas.includes(String(value))
                            ? { color: '#8a92ae', textDecoration: 'line-through' }
                            : undefined
                        }
                      >
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 0, right: margemDireita, top: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="var(--grid)" horizontal={false} syncWithTicks />
                  <XAxis
                    type="number"
                    domain={[0, maxPct]}
                    ticks={ticksX}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={eixoY}
                    interval={0}
                    tick={(props) => <TickRotulo {...props} maxPx={ROTULO_MAX_PX} escala={escala} />}
                  />
                  <Tooltip
                    formatter={(_value, _name, item) => [
                      formatPctVal(Number(item.payload.pct), Number(item.payload.n)),
                      'Resultado',
                    ]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                  />
                  <Bar dataKey="pct" radius={[0, 8, 8, 0]} maxBarSize={34}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="labelFull"
                      content={(props) => (
                        <text
                          x={Number(props.x ?? 0) + Number(props.width ?? 0) + 5}
                          y={Number(props.y ?? 0) + Number(props.height ?? 0) / 2}
                          dominantBaseline="central"
                          fontSize={FONTE_PX * escala}
                          fill="#4b5474"
                        >
                          {String(props.value ?? '')}
                        </text>
                      )}
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
                  itemSorter={(item) => -Number(item.value ?? 0)}
                />
                <Legend
                  wrapperStyle={{ cursor: 'pointer' }}
                  onClick={(e) => alternaSerie(String(e.dataKey ?? e.value))}
                  formatter={(value, _entry, index) => (
                    <>
                      <span
                        style={
                          ocultas.includes(String(value))
                            ? { color: '#8a92ae', textDecoration: 'line-through' }
                            : undefined
                        }
                      >
                        {value}
                      </span>
                      {index === (pergunta.tracking?.series.length ?? 0) - 1 && (
                        <span
                          className="legend-info"
                          data-tip="Clique nos nomes para ocultar ou mostrar as linhas"
                          aria-label="Clique nos nomes para ocultar ou mostrar as linhas"
                          onClick={(e) => e.stopPropagation()}
                        >
                          i
                        </span>
                      )}
                    </>
                  )}
                />
                {pergunta.tracking.series.map((s, i) => (
                  <Line
                    key={s}
                    hide={ocultas.includes(s)}
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
                {itensExibidos.map((it) => (
                  <tr key={it.label} className={it.label === top3[0]?.label ? 'top' : undefined}>
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
