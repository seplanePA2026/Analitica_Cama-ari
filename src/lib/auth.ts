export type Conta = {
  email: string
  senha: string
  nome: string
}

/** Únicos usuários autorizados no painel. */
export const CONTAS: readonly Conta[] = [
  { email: 'geraldo@gmail.com', senha: 'Analitica2026', nome: 'Geraldo' },
  { email: 'joseremelo@gmail.com', senha: 'Analitica2026', nome: 'Joseremelo' },
] as const

export function autenticar(usuario: string, senha: string): Conta | null {
  const email = usuario.trim().toLowerCase()
  if (!email || !senha) return null
  return CONTAS.find((c) => c.email === email && c.senha === senha) ?? null
}

export function sessaoValida(usuario: string | undefined | null): boolean {
  if (!usuario) return false
  const email = usuario.trim().toLowerCase()
  return CONTAS.some((c) => c.email === email)
}
