import { useState } from 'react'

type Props = {
  temas: string[]
  temaAtivo: string
  onSelect: (tema: string) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function TemaNav({ temas, temaAtivo, onSelect, mobileOpen, onMobileClose }: Props) {
  return (
    <>
      {mobileOpen && <div className="sheet-backdrop" onClick={onMobileClose} aria-hidden />}
      <nav
        className={`col temas${mobileOpen ? ' sheet-open' : ''}`}
        aria-label="Temas"
      >
        <div className="sheet-head mobile-only">
          <h2>Temas</h2>
          <button type="button" className="sheet-close" onClick={onMobileClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <h2 className="desktop-only">Temas</h2>
        <div className="scroll">
          {temas.map((tema) => (
            <button
              key={tema}
              type="button"
              className="tab"
              aria-current={tema === temaAtivo}
              onClick={() => {
                onSelect(tema)
                onMobileClose?.()
              }}
            >
              <span>{tema}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

export function useMobileSheet() {
  const [open, setOpen] = useState<'temas' | 'perguntas' | null>(null)
  return {
    open,
    openTemas: () => setOpen('temas'),
    openPerguntas: () => setOpen('perguntas'),
    close: () => setOpen(null),
  }
}
