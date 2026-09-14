import { useEffect, useRef, useState } from 'react'

type User = { nome: string; usuario: string }

type Props = {
  user: User
  onLogout: () => void
}

export function UserMenu({ user, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const [dadosOpen, setDadosOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iniciais = user.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-chip"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-avatar">{iniciais || 'U'}</span>
        <span className="user-name">{user.nome}</span>
      </button>
      {open && (
        <div className="user-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setDadosOpen(true)
            }}
          >
            Dados do usuário
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          >
            Sair
          </button>
        </div>
      )}

      {dadosOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setDadosOpen(false)} aria-hidden />
          <div className="user-dados-modal" role="dialog" aria-modal="true">
            <div className="sheet-head">
              <h2>Dados do usuário</h2>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setDadosOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="user-dados-body">
              <div>
                <span className="meta">Nome</span>
                <strong>{user.nome}</strong>
              </div>
              <div>
                <span className="meta">Usuário</span>
                <strong>{user.usuario}</strong>
              </div>
              <div>
                <span className="meta">Perfil</span>
                <strong>Analista</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
