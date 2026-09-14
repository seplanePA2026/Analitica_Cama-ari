import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { MapaPonto, Pergunta, Respondente } from '../types'
import malha from '../data/regioes_pesquisa.json'
import { formatPct, formatVal } from './BarraHorizontal'
import 'leaflet/dist/leaflet.css'

type RegiaoProps = { regiao: string; n_bairros: number; pop_2024: number; bairros: string; label: [number, number] }
type BairroProps = {
  id: number
  bairro: string
  regiao: string | null
  status: string
  n_pontos: number
  nomes: string | null
}

const REGIOES = malha.regioes as unknown as FeatureCollection<Geometry, RegiaoProps>
const BAIRROS = malha.bairros as unknown as FeatureCollection<Geometry, BairroProps>
const MUNICIPIO = malha.municipio as unknown as FeatureCollection

const COR_A = '#3068c0'
const COR_B = '#7c3aed'
const NEUTRO = '#f3f1ec'
const VERDE = '#13774a'
const VERMELHO = '#b3261e'
// Respostas em que "mais" é ruim (rejeição, desaprovação...): acima do total fica vermelho
const RESPOSTA_NEGATIVA = /desaprova|errado|ruim|p[ée]ssim|n[ãa]o votaria|conhece e n[ãa]o vota|oposi[çc][ãa]o/i
const SEM_REGIAO = '#c9ceda'
const BASE_MINIMA = 30
// Deslocamento (px) dos rótulos das regiões da Sede, que se sobrepõem com o mapa afastado
const DESLOCA: Record<string, [number, number]> = {
  'Região 1': [-78, -48],
  'Região 2': [-92, 44],
  'Região 3': [84, 18],
}
const ZOOM_SEM_DESLOCA = 14

type Filtros = { sexo: string; idade: string; religiao: string; escolaridade: string; renda: string; data: string }
const FILTROS_VAZIOS: Filtros = { sexo: '', idade: '', religiao: '', escolaridade: '', renda: '', data: '' }
const CAMPOS: { key: keyof Filtros; label: string }[] = [
  { key: 'sexo', label: 'Sexo' },
  { key: 'idade', label: 'Faixa etária' },
  { key: 'religiao', label: 'Religião' },
  { key: 'escolaridade', label: 'Escolaridade' },
  { key: 'renda', label: 'Renda' },
  { key: 'data', label: 'Data' },
]

type Props = {
  pontos: MapaPonto[]
  respondentes: Respondente[]
  perguntas: Pergunta[]
  regioes: string[]
  datas: { iso: string; label: string }[]
}

type Contagem = { label: string; n: number; pct: number }
type ResultadoRegiao = { regiao: string; base: number; n: number; pct: number; itens: Contagem[] }

function pct(n: number, base: number) {
  return base ? Math.round((1000 * n) / base) / 10 : 0
}

function contar(rows: Respondente[], campo: string): { base: number; itens: Contagem[] } {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const v = r[campo]
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const base = [...counts.values()].reduce((s, n) => s + n, 0)
  const itens = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => ({ label, n, pct: pct(n, base) }))
  return { base, itens }
}

function hex(c: string) {
  const v = parseInt(c.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function interpola(de: string, para: string, t: number) {
  const a = hex(de)
  const b = hex(para)
  const m = a.map((x, i) => Math.round(x + (b[i] - x) * t))
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`
}

function numeroRegiao(r: string) {
  return r.replace(/\D/g, '')
}

function MapaAjuste() {
  const map = useMap()
  useEffect(() => {
    const bounds = L.geoJSON(MUNICIPIO).getBounds()
    map.fitBounds(bounds, { padding: [10, 10] })
    const t1 = window.setTimeout(() => map.invalidateSize(), 50)
    const t2 = window.setTimeout(() => {
      map.invalidateSize()
      map.fitBounds(bounds, { padding: [10, 10] })
    }, 300)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', onResize)
    }
  }, [map])
  return null
}

function ZoomWatch({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => onZoom(map.getZoom()), [map, onZoom])
  return null
}

export function VistaMapaRegioes({ pontos, respondentes, perguntas, regioes, datas }: Props) {
  const indicadores = useMemo(() => perguntas.filter((p) => p.id !== 'regiao' && p.id !== 'dia'), [perguntas])
  const temas = useMemo(() => [...new Set(indicadores.map((p) => p.tema))], [indicadores])
  const [perguntaId, setPerguntaId] = useState(
    () => indicadores.find((p) => p.id === 'gov_est')?.id ?? indicadores[0]?.id ?? '',
  )
  const [respostaSel, setRespostaSel] = useState('')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [regA, setRegA] = useState(regioes[0] ?? '')
  const [regB, setRegB] = useState(regioes[1] ?? '')
  const [proximo, setProximo] = useState<'A' | 'B'>('A')
  const [hover, setHover] = useState<string | null>(null)
  const [mostrarPontos, setMostrarPontos] = useState(false)
  const [zoom, setZoom] = useState(11)

  const pergunta = indicadores.find((p) => p.id === perguntaId)

  const opcoes = useMemo(() => {
    const uniq = (k: keyof Filtros) =>
      [...new Set(respondentes.map((r) => (k === 'data' ? r.data : r[k])).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      )
    return {
      sexo: uniq('sexo'),
      idade: uniq('idade'),
      religiao: uniq('religiao'),
      escolaridade: uniq('escolaridade'),
      renda: uniq('renda'),
      data: datas.map((d) => d.iso),
    }
  }, [respondentes, datas])

  const rotuloData = (iso: string) => datas.find((d) => d.iso === iso)?.label ?? iso

  const filtradosIdx = useMemo(() => {
    const out: number[] = []
    respondentes.forEach((r, i) => {
      if (filtros.sexo && r.sexo !== filtros.sexo) return
      if (filtros.idade && r.idade !== filtros.idade) return
      if (filtros.religiao && r.religiao !== filtros.religiao) return
      if (filtros.escolaridade && r.escolaridade !== filtros.escolaridade) return
      if (filtros.renda && r.renda !== filtros.renda) return
      if (filtros.data && r.data !== filtros.data) return
      out.push(i)
    })
    return out
  }, [respondentes, filtros])

  const filtrados = useMemo(() => filtradosIdx.map((i) => respondentes[i]), [filtradosIdx, respondentes])

  const respostas = useMemo(() => contar(respondentes, perguntaId).itens.map((i) => i.label), [respondentes, perguntaId])
  const resposta = respostas.includes(respostaSel) ? respostaSel : (respostas[0] ?? '')

  const geral = useMemo(() => contar(filtrados, perguntaId), [filtrados, perguntaId])
  const geralPct = geral.itens.find((i) => i.label === resposta)?.pct ?? 0

  const porRegiao = useMemo(() => {
    const map = new Map<string, ResultadoRegiao>()
    for (const reg of regioes) {
      const { base, itens } = contar(
        filtrados.filter((r) => r.regiao === reg),
        perguntaId,
      )
      const it = itens.find((i) => i.label === resposta)
      map.set(reg, { regiao: reg, base, n: it?.n ?? 0, pct: it?.pct ?? 0, itens })
    }
    return map
  }, [filtrados, regioes, perguntaId, resposta])

  const negativa = /rej/.test(perguntaId) || RESPOSTA_NEGATIVA.test(resposta)
  const corAcima = negativa ? VERMELHO : VERDE
  const corAbaixo = negativa ? VERDE : VERMELHO

  // maior distância (p.p.) de uma região ao total — define a intensidade da cor
  const amplitude = useMemo(() => {
    const vals = [...porRegiao.values()].filter((r) => r.base > 0).map((r) => Math.abs(r.pct - geralPct))
    return Math.round(Math.max(0, ...vals) * 10) / 10
  }, [porRegiao, geralPct])

  const lider = useMemo(() => {
    const vals = [...porRegiao.values()].filter((r) => r.base > 0)
    return vals.length ? vals.reduce((a, b) => (b.pct > a.pct ? b : a)).regiao : null
  }, [porRegiao])

  function corDe(reg: string) {
    const r = porRegiao.get(reg)
    if (!r || !r.base) return SEM_REGIAO
    const diff = r.pct - geralPct
    if (amplitude < 0.5 || diff === 0) return NEUTRO
    const t = Math.min(1, Math.abs(diff) / amplitude)
    return interpola(NEUTRO, diff > 0 ? corAcima : corAbaixo, t)
  }

  function estiloRegiao(reg: string): L.PathOptions {
    const sel = reg === regA ? COR_A : reg === regB ? COR_B : null
    return {
      fillColor: corDe(reg),
      fillOpacity: hover === reg ? 0.92 : 0.78,
      color: sel ?? '#1a2140',
      weight: sel ? 3.5 : hover === reg ? 2.2 : 1.2,
      opacity: sel ? 1 : 0.55,
    }
  }

  const regioesRef = useRef<L.GeoJSON | null>(null)
  useEffect(() => {
    regioesRef.current?.eachLayer((layer) => {
      const f = (layer as L.Path & { feature?: Feature<Geometry, RegiaoProps> }).feature
      if (f) (layer as L.Path).setStyle(estiloRegiao(f.properties.regiao))
    })
  })

  const escolherRef = useRef<(reg: string) => void>(() => {})
  useEffect(() => {
    escolherRef.current = (reg: string) => {
      if (proximo === 'A') {
        if (reg === regB) setRegB(regA)
        setRegA(reg)
        setProximo('B')
      } else {
        if (reg === regA) setRegA(regB)
        setRegB(reg)
        setProximo('A')
      }
    }
  }, [proximo, regA, regB])

  const comparacao = useMemo(() => {
    const a = porRegiao.get(regA)
    const b = porRegiao.get(regB)
    const labels = geral.itens.slice(0, 8).map((i) => i.label)
    return labels.map((label) => {
      const pa = a?.itens.find((i) => i.label === label)?.pct ?? 0
      const pb = b?.itens.find((i) => i.label === label)?.pct ?? 0
      return { label, pa, pb, diff: Math.round((pa - pb) * 10) / 10 }
    })
  }, [porRegiao, regA, regB, geral.itens])

  const maxComp = Math.max(1, ...comparacao.flatMap((c) => [c.pa, c.pb]))
  const nFiltros = Object.values(filtros).filter(Boolean).length

  return (
    <div className="mr-layout">
      <aside className="mr-side">
        <section className="mr-card">
          <label className="mr-field">
            Indicador
            <select
              value={perguntaId}
              onChange={(e) => {
                setPerguntaId(e.target.value)
                setRespostaSel('')
              }}
            >
              {temas.map((t) => (
                <optgroup key={t} label={t}>
                  {indicadores
                    .filter((p) => p.tema === t)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="mr-field">
            Resposta pintada no mapa
            <select value={resposta} onChange={(e) => setRespostaSel(e.target.value)}>
              {respostas.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div className="mr-filtros">
            {CAMPOS.map(({ key, label }) => (
              <label key={key} className="mr-field small">
                {label}
                <select value={filtros[key]} onChange={(e) => setFiltros({ ...filtros, [key]: e.target.value })}>
                  <option value="">Todos</option>
                  {opcoes[key].map((o) => (
                    <option key={o} value={o}>
                      {key === 'data' ? rotuloData(o) : o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="mr-base">
            <span className="meta">
              {formatVal(filtrados.length)} de {formatVal(respondentes.length)} entrevistas
            </span>
            {nFiltros > 0 && (
              <button type="button" className="filter-clear" onClick={() => setFiltros(FILTROS_VAZIOS)}>
                Limpar filtros
              </button>
            )}
          </div>
          <label className="mr-check">
            <input type="checkbox" checked={mostrarPontos} onChange={(e) => setMostrarPontos(e.target.checked)} />
            Mostrar entrevistas no mapa
          </label>
        </section>

        <section className="mr-card">
          <h3 className="mr-title">
            {resposta || '—'}
            <span className="meta"> · {pergunta?.title}</span>
          </h3>
          <div className="mr-geral">
            <span className="mr-geral-val">{formatPct(geralPct)}</span>
            <span className="meta">no total · base {formatVal(geral.base)}</span>
          </div>
          <div className="tbl mr-rank">
            <table>
              <thead>
                <tr>
                  <th>Região</th>
                  <th className="num">%</th>
                  <th className="num">vs total</th>
                  <th className="num">Base</th>
                </tr>
              </thead>
              <tbody>
                {regioes.map((reg) => {
                  const r = porRegiao.get(reg)!
                  const d = Math.round((r.pct - geralPct) * 10) / 10
                  return (
                    <tr
                      key={reg}
                      className={reg === lider ? 'top' : undefined}
                      onMouseEnter={() => setHover(reg)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <td>
                        <span className="mr-swatch" style={{ background: corDe(reg) }} />
                        {reg}
                        {reg === regA && <span className="mr-tag a">A</span>}
                        {reg === regB && <span className="mr-tag b">B</span>}
                      </td>
                      <td className="num">{r.base ? formatPct(r.pct) : '—'}</td>
                      <td className={`num ${d === 0 ? '' : (d > 0) !== negativa ? 'pos' : 'neg'}`}>
                        {r.base ? `${d > 0 ? '+' : ''}${d.toLocaleString('pt-BR')} p.p.` : '—'}
                      </td>
                      <td className="num">
                        {formatVal(r.base)}
                        {r.base > 0 && r.base < BASE_MINIMA && <span title="Base reduzida"> *</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {[...porRegiao.values()].some((r) => r.base > 0 && r.base < BASE_MINIMA) && (
            <p className="meta mr-nota">* Base abaixo de {BASE_MINIMA} entrevistas: leia com cautela.</p>
          )}
        </section>

        <section className="mr-card">
          <h3 className="mr-title">Comparar regiões</h3>
          <div className="mr-ab">
            <label className="mr-field small">
              <span>
                <span className="mr-tag a">A</span>
              </span>
              <select value={regA} onChange={(e) => setRegA(e.target.value)}>
                {regioes.map((r) => (
                  <option key={r} value={r} disabled={r === regB}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="mr-field small">
              <span>
                <span className="mr-tag b">B</span>
              </span>
              <select value={regB} onChange={(e) => setRegB(e.target.value)}>
                {regioes.map((r) => (
                  <option key={r} value={r} disabled={r === regA}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="meta mr-nota">
            Clique no mapa para trocar a região {proximo}. Bases: A {formatVal(porRegiao.get(regA)?.base ?? 0)} · B{' '}
            {formatVal(porRegiao.get(regB)?.base ?? 0)}
          </p>
          <div className="mr-comp">
            {comparacao.map((c) => (
              <div key={c.label} className={`mr-comp-row${c.label === resposta ? ' ativa' : ''}`}>
                <div className="mr-comp-head">
                  <button type="button" className="mr-comp-label" onClick={() => setRespostaSel(c.label)}>
                    {c.label}
                  </button>
                  <span className={`mr-diff ${c.diff > 0 ? 'pos' : c.diff < 0 ? 'neg' : ''}`}>
                    {c.diff > 0 ? '+' : ''}
                    {c.diff.toLocaleString('pt-BR')} p.p.
                  </span>
                </div>
                <div className="mr-bar">
                  <span style={{ width: `${(c.pa / maxComp) * 100}%`, background: COR_A }} />
                  <em>{formatPct(c.pa)}</em>
                </div>
                <div className="mr-bar">
                  <span style={{ width: `${(c.pb / maxComp) * 100}%`, background: COR_B }} />
                  <em>{formatPct(c.pb)}</em>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <div className="map-frame mr-map">
        <MapContainer center={[-12.7, -38.3]} zoom={11} zoomSnap={0.5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <MapaAjuste />
          <ZoomWatch onZoom={setZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON
            ref={regioesRef}
            data={REGIOES}
            style={(f) => estiloRegiao((f as Feature<Geometry, RegiaoProps>).properties.regiao)}
            interactive={false}
          />
          <GeoJSON
            data={BAIRROS}
            style={(f) => {
              const p = (f as Feature<Geometry, BairroProps>).properties
              return p.regiao
                ? { color: '#ffffff', weight: 0.7, opacity: 0.8, fillOpacity: 0 }
                : { color: '#8a92ae', weight: 0.8, opacity: 0.9, dashArray: '3 3', fillColor: SEM_REGIAO, fillOpacity: 0.45 }
            }}
            onEachFeature={(f, layer) => {
              const p = f.properties as BairroProps
              layer.bindTooltip(
                `<strong>${p.bairro}</strong><br/>${p.regiao ?? 'Sem região definida'}<br/>` +
                  `<span class="mr-tt-meta">${p.n_pontos} entrevista${p.n_pontos === 1 ? '' : 's'}</span>` +
                  (p.nomes ? `<br/><span class="mr-tt-meta">Bairro informado: ${p.nomes}</span>` : ''),
                { sticky: true, className: 'mr-tooltip', opacity: 1 },
              )
              if (!p.regiao) return
              layer.on({
                mouseover: () => setHover(p.regiao),
                mouseout: () => setHover(null),
                click: () => escolherRef.current(p.regiao!),
              })
            }}
          />
          <GeoJSON
            data={MUNICIPIO}
            interactive={false}
            style={{ color: '#1a2140', weight: 2.2, opacity: 0.85, fill: false }}
          />
          {mostrarPontos &&
            filtradosIdx.map((i) => {
              const p = pontos[i]
              if (!p || (!p.lat && !p.lng)) return null
              const marca = respondentes[i][perguntaId] === resposta
              return (
                <CircleMarker
                  key={i}
                  center={[p.lat, p.lng]}
                  radius={marca ? 4 : 3}
                  interactive={false}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 0.8,
                    fillColor: marca ? '#1a2140' : '#8a92ae',
                    fillOpacity: marca ? 0.95 : 0.6,
                  }}
                />
              )
            })}
          {REGIOES.features.map((f) => {
            const reg = f.properties.regiao
            const r = porRegiao.get(reg)
            const v = r?.base ? formatPct(r.pct) : '—'
            const cls = reg === regA ? ' a' : reg === regB ? ' b' : ''
            const [dx, dy] = zoom < ZOOM_SEM_DESLOCA ? (DESLOCA[reg] ?? [0, 0]) : [0, 0]
            const linha =
              dx || dy
                ? `<svg class="mr-leader" width="1" height="1"><line x1="0" y1="0" x2="${dx}" y2="${dy}" /></svg><i class="mr-leader-dot"></i>`
                : ''
            return (
              <Marker
                key={`${reg}-${v}-${cls}-${dx}`}
                position={f.properties.label}
                interactive={false}
                icon={L.divIcon({
                  className: 'mr-label-wrap',
                  html: `${linha}<div class="mr-label${cls}" style="left:${dx}px;top:${dy}px"><b>R${numeroRegiao(reg)}</b><span>${v}</span></div>`,
                  iconSize: [0, 0],
                })}
              />
            )
          })}
        </MapContainer>

        <div className="mr-legenda">
          <div className="mr-legenda-title">{resposta}</div>
          <div
            className="mr-legenda-bar"
            style={{ background: `linear-gradient(90deg, ${corAbaixo}, ${NEUTRO} 50%, ${corAcima})` }}
          />
          <div className="mr-legenda-scale">
            <span>−{amplitude.toLocaleString('pt-BR')} p.p.</span>
            <span>total {formatPct(geralPct)}</span>
            <span>+{amplitude.toLocaleString('pt-BR')} p.p.</span>
          </div>
          <div className="mr-legenda-nota">
            {negativa ? 'Vermelho: acima do total (resposta negativa)' : 'Verde: acima do total do município'}
          </div>
          <div className="mr-legenda-sem">
            <span className="mr-swatch dashed" /> Bairro sem região definida
          </div>
        </div>
      </div>
    </div>
  )
}
