import { useEffect, useRef, useState } from 'react'
import type { Aba } from '../types'
import { UserMenu } from './UserMenu'

export const ABAS: { id: Aba; label: string }[] = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'lista', label: 'Listas' },
  { id: 'relatorio', label: 'Relatório' },
  { id: 'tabela', label: 'Tabela' },
  { id: 'acumulativo', label: 'Acumulativo' },
]

type User = { nome: string; usuario: string }

type Props = {
  aba: Aba
  onAba: (a: Aba) => void
  onExportExcel: () => void
  onExportPdf: () => void | Promise<void>
  exportBusy?: boolean
  user: User
  onLogout: () => void
  showFilterToggle?: boolean
  filtersActive?: boolean
  onOpenFilters?: () => void
}

function NavButtons({
  aba,
  onAba,
  className,
}: {
  aba: Aba
  onAba: (a: Aba) => void
  className?: string
}) {
  return (
    <nav className={className} aria-label="Modos de visualização">
      {ABAS.map((a) => (
        <button
          key={a.id}
          type="button"
          className="nav-btn"
          aria-current={aba === a.id}
          onClick={() => onAba(a.id)}
        >
          {a.label}
        </button>
      ))}
    </nav>
  )
}

export function TopBar({
  aba,
  onAba,
  onExportExcel,
  onExportPdf,
  exportBusy,
  user,
  onLogout,
  showFilterToggle,
  filtersActive,
  onOpenFilters,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="topbar-stack">
      <header className="topbar">
        <div className="topbar-side">
          <img className="brand-logo" src="/analitica-logo.png" alt="Analítica" />
        </div>

        <NavButtons aba={aba} onAba={onAba} className="topbar-nav desktop-nav" />

        <div className="topbar-side right" ref={menuRef}>
          <UserMenu user={user} onLogout={onLogout} />

          <button
            type="button"
            className="print-btn"
            aria-label="Exportar"
            aria-expanded={menuOpen}
            disabled={exportBusy}
            onClick={() => setMenuOpen((v) => !v)}
            title="Exportar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 14h10v6H7v-6Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showFilterToggle && (
            <button
              type="button"
              className={`filter-hamburger mobile-only${filtersActive ? ' active' : ''}`}
              aria-label="Abrir filtros do relatório"
              onClick={onOpenFilters}
            >
              <span />
              <span />
              <span />
            </button>
          )}

          {menuOpen && (
            <div className="export-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onExportExcel()
                }}
              >
                Exportar Excel
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={exportBusy}
                onClick={async () => {
                  setMenuOpen(false)
                  await onExportPdf()
                }}
              >
                {exportBusy ? 'Gerando PDF…' : 'Exportar PDF'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="topbar-sub mobile-only">
        <NavButtons aba={aba} onAba={onAba} className="topbar-nav sub-nav" />
      </div>
    </div>
  )
}
