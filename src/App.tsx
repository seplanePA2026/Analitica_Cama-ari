import { useEffect, useMemo, useState } from 'react'
import './App.css'
import data from './data/resultados.json'
import { FilterBar, FilterDrawer } from './components/FilterBar'
import { LoginScreen } from './components/LoginScreen'
import { PerguntaLista } from './components/PerguntaLista'
import { ResultadoPanel } from './components/ResultadoPanel'
import { TemaNav } from './components/TemaNav'
import { TopBar } from './components/TopBar'
import { VistaAcumulativo } from './components/VistaAcumulativo'
import { VistaMapa } from './components/VistaMapa'
import { VistaRelatorio } from './components/VistaRelatorio'
import { VistaTabela } from './components/VistaTabela'
import {
  exportRelatorioExcel,
  exportRelatorioPdfBranded,
  exportTabelaExcel,
  exportTabelaPdfBranded,
} from './lib/export'
import {
  FILTROS_VAZIOS,
  filtrosAtivos,
  perguntasComFiltro,
  uniqueSorted,
  type RelatorioFiltros,
} from './lib/filters'
import type { Aba, Pergunta, Resultados } from './types'

const D = data as Resultados
const AUTH_KEY = 'tracking-camacari-auth'

type Modo = 'graf' | 'linha' | 'tabela'
type AuthUser = { nome: string; usuario: string }

function loadAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed?.nome || !parsed?.usuario) return null
    return parsed
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => loadAuth())
  const [aba, setAba] = useState<Aba>('lista')
  const [tema, setTema] = useState(D.temas[0])
  const [curId, setCurId] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>('graf')
  const [sheet, setSheet] = useState<'temas' | 'perguntas' | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const [contentKey, setContentKey] = useState(0)
  const [filtros, setFiltros] = useState<RelatorioFiltros>(FILTROS_VAZIOS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const filterOptions = useMemo(
    () => ({
      sexo: uniqueSorted(D.respondentes, 'sexo'),
      idade: uniqueSorted(D.respondentes, 'idade'),
      religiao: uniqueSorted(D.respondentes, 'religiao'),
      escolaridade: uniqueSorted(D.respondentes, 'escolaridade'),
      renda: uniqueSorted(D.respondentes, 'renda'),
      regiao: uniqueSorted(D.respondentes, 'regiao'),
    }),
    [],
  )

  const { perguntas: perguntasFiltradas, n: nFiltrado } = useMemo(
    () => perguntasComFiltro(D.perguntas, D.respondentes, filtros),
    [filtros],
  )

  const hasFiltros = filtrosAtivos(filtros)

  const doTema = useMemo(() => D.perguntas.filter((p) => p.tema === tema), [tema])

  const cur: Pergunta | null = useMemo(() => {
    if (!doTema.length) return null
    return doTema.find((p) => p.id === curId) ?? doTema[0]
  }, [doTema, curId])

  useEffect(() => {
    if (cur && !doTema.some((p) => p.id === cur.id)) {
      setCurId(doTema[0]?.id ?? null)
      setModo('graf')
    }
  }, [doTema, cur])

  useEffect(() => {
    const scroller = document.querySelector('.app-content')
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0
  }, [aba, contentKey])

  useEffect(() => {
    if (aba !== 'lista') setSheet(null)
  }, [aba])

  useEffect(() => {
    if (aba !== 'relatorio') setFilterDrawerOpen(false)
  }, [aba])

  function changeAba(next: Aba) {
    if (next === aba) return
    setAba(next)
    setContentKey((k) => k + 1)
    requestAnimationFrame(() => {
      const scroller = document.querySelector('.app-content')
      if (scroller instanceof HTMLElement) scroller.scrollTop = 0
      window.scrollTo(0, 0)
    })
  }

  useEffect(() => {
    if (aba !== 'lista') return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return
      const i = doTema.findIndex((p) => p.id === cur?.id)
      const ti = D.temas.indexOf(tema)
      if (e.key === 'ArrowDown' && i < doTema.length - 1) {
        setCurId(doTema[i + 1].id)
        setModo('graf')
        e.preventDefault()
      } else if (e.key === 'ArrowUp' && i > 0) {
        setCurId(doTema[i - 1].id)
        setModo('graf')
        e.preventDefault()
      } else if (e.key === 'ArrowRight' && ti < D.temas.length - 1) {
        setTema(D.temas[ti + 1])
        setCurId(null)
        setModo('graf')
        e.preventDefault()
      } else if (e.key === 'ArrowLeft' && ti > 0) {
        setTema(D.temas[ti - 1])
        setCurId(null)
        setModo('graf')
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aba, doTema, cur, tema])

  function onLogin(nome: string, usuario: string) {
    const next = { nome, usuario }
    localStorage.setItem(AUTH_KEY, JSON.stringify(next))
    setUser(next)
  }

  function onLogout() {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  function onExportExcel() {
    if (aba === 'tabela') {
      exportTabelaExcel(D.tabela, 'bd-camacari-resultados.xlsx')
      return
    }
    exportRelatorioExcel(perguntasFiltradas, 'relatorio-camacari.xlsx')
  }

  async function onExportPdf() {
    setExportBusy(true)
    try {
      if (aba === 'tabela') {
        await exportTabelaPdfBranded(D.tabela, {
          titulo: D.meta.titulo,
          subtitulo: D.meta.subtitulo,
        })
        return
      }
      await exportRelatorioPdfBranded(perguntasFiltradas, {
        titulo: D.meta.titulo,
        subtitulo: D.meta.subtitulo,
        n_entrevistas: nFiltrado,
        gerado_em: D.meta.gerado_em,
      })
    } finally {
      setExportBusy(false)
    }
  }

  if (!user) {
    return <LoginScreen onLogin={onLogin} />
  }

  return (
    <div className="app">
      <TopBar
        aba={aba}
        onAba={changeAba}
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
        exportBusy={exportBusy}
        user={user}
        onLogout={onLogout}
        showFilterToggle={aba === 'relatorio'}
        filtersActive={hasFiltros}
        onOpenFilters={() => setFilterDrawerOpen(true)}
      />

      {aba === 'relatorio' && (
        <FilterBar
          value={filtros}
          options={filterOptions}
          onChange={setFiltros}
          onClear={() => setFiltros(FILTROS_VAZIOS)}
          baseN={D.meta.n_entrevistas}
          filteredN={nFiltrado}
        />
      )}

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        value={filtros}
        options={filterOptions}
        onChange={setFiltros}
        onClear={() => setFiltros(FILTROS_VAZIOS)}
        baseN={D.meta.n_entrevistas}
        filteredN={nFiltrado}
      />

      <div className="app-content">
        <div key={`${aba}-${contentKey}`} className="view-fade">
          {aba === 'lista' && (
            <div className="body">
              <div className="mobile-pickers mobile-only">
                <button type="button" className="picker-btn" onClick={() => setSheet('temas')}>
                  Tema: {tema}
                </button>
                <button type="button" className="picker-btn" onClick={() => setSheet('perguntas')}>
                  Pergunta: {cur?.title ?? 'Selecionar'}
                </button>
              </div>

              <TemaNav
                temas={D.temas}
                temaAtivo={tema}
                mobileOpen={sheet === 'temas'}
                onMobileClose={() => setSheet(null)}
                onSelect={(t) => {
                  setTema(t)
                  setCurId(null)
                  setModo('graf')
                }}
              />
              <PerguntaLista
                tema={tema}
                perguntas={doTema}
                ativa={cur}
                mobileOpen={sheet === 'perguntas'}
                onMobileClose={() => setSheet(null)}
                onSelect={(p) => {
                  setCurId(p.id)
                  setModo('graf')
                }}
              />
              {cur && <ResultadoPanel pergunta={cur} modo={modo} onModo={setModo} />}
            </div>
          )}

          {aba === 'mapa' && <VistaMapa pontos={D.mapa} />}
          {aba === 'relatorio' && (
            <VistaRelatorio
              perguntas={perguntasFiltradas}
              temas={D.temas}
              dims={D.cruz_dims}
              titulo={D.meta.titulo}
              hideToolbarExport
              filteredN={nFiltrado}
              baseN={D.meta.n_entrevistas}
              filtrosAtivos={hasFiltros}
            />
          )}
          {aba === 'tabela' && (
            <VistaTabela tabela={D.tabela} titulo={D.meta.titulo} hideToolbarExport />
          )}
          {aba === 'acumulativo' && (
            <VistaAcumulativo
              respondentes={D.respondentes}
              opcoes={D.acum_opcoes}
              regioes={D.filtros.regioes}
            />
          )}
        </div>
      </div>
    </div>
  )
}
