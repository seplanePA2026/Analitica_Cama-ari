import { useState } from 'react'
import { autenticar } from '../lib/auth'

type Props = {
  onLogin: (nome: string, usuario: string) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  function tentarLogin() {
    const conta = autenticar(usuario, senha)
    if (!conta) {
      setErro('E-mail ou senha inválidos. Use uma conta autorizada.')
      return
    }
    setErro('')
    onLogin(conta.nome, conta.email)
  }

  return (
    <div className="login-screen">
      <div className="login-glow" aria-hidden />
      <div className="login-card">
        <img src="/analitica-logo.png" alt="Analítica" className="login-logo" />
        <h1>Acesso ao painel</h1>
        <p>Tracking Municipal · Camaçari 2026</p>

        <label>
          E-mail
          <input
            autoComplete="username"
            type="email"
            value={usuario}
            onChange={(e) => {
              setUsuario(e.target.value)
              if (erro) setErro('')
            }}
            onKeyDown={(e) => {
              // bloqueia Enter — login só pelo botão
              if (e.key === 'Enter') e.preventDefault()
            }}
            placeholder="seu.email@gmail.com"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value)
              if (erro) setErro('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
            placeholder="••••••••"
          />
        </label>

        {erro ? <p className="login-erro">{erro}</p> : null}

        <button type="button" className="login-submit" onClick={tentarLogin}>
          Entrar
        </button>
      </div>
    </div>
  )
}
