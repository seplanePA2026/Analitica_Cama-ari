import type { Pergunta } from '../types'

type Props = {
  tema: string
  perguntas: Pergunta[]
  ativa: Pergunta | null
  onSelect: (p: Pergunta) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function PerguntaLista({
  tema,
  perguntas,
  ativa,
  onSelect,
  mobileOpen,
  onMobileClose,
}: Props) {
  return (
    <>
      {mobileOpen && <div className="sheet-backdrop" onClick={onMobileClose} aria-hidden />}
      <aside
        className={`col lista${mobileOpen ? ' sheet-open' : ''}`}
        aria-label="Perguntas"
      >
        <div className="sheet-head mobile-only">
          <h2>{tema}</h2>
          <button type="button" className="sheet-close" onClick={onMobileClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <h2 className="desktop-only">{tema}</h2>
        <div className="scroll">
          {perguntas.map((p) => (
            <button
              key={p.id}
              type="button"
              className="item"
              aria-current={ativa?.id === p.id}
              onClick={() => {
                onSelect(p)
                onMobileClose?.()
              }}
            >
              {p.title}
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
