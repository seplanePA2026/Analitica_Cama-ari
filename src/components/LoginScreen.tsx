import { useState } from 'react'

type Props = {
  onLogin: (nome: string, usuario: string) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const raw = usuario.trim() || 'Analista'
    const nome = raw.includes('@') ? raw.split('@')[0] : raw
    const display = nome.charAt(0).toUpperCase() + nome.slice(1)
    onLogin(display, raw)
  }

  return (
    <div className="login-screen">
      <div className="login-glow" aria-hidden />
      <form className="login-card" onSubmit={submit}>
        <img src="/analitica-logo.png" alt="Analítica" className="login-logo" />
        <h1>Acesso ao painel</h1>
        <p>Tracking Municipal · Camaçari 2026</p>

        <label>
          Usuário
          <input
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="seu.usuario"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="login-submit">
          Entrar
        </button>
      </form>
    </div>
  )
}
