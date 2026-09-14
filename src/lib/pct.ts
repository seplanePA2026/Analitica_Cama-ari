/** Arredondamento half-to-even (igual ao Python) em 1 casa decimal. */
export function round1(n: number): number {
  const scaled = n * 10
  const floor = Math.floor(scaled)
  const frac = scaled - floor
  // tolerância para lixo de ponto flutuante perto de .5
  if (frac > 0.5 + 1e-10) return (floor + 1) / 10
  if (frac < 0.5 - 1e-10) return floor / 10
  return (floor % 2 === 0 ? floor : floor + 1) / 10
}

/** Percentual 0–100 com 1 casa, half-to-even. */
export function pct1(n: number, base: number): number {
  if (!base) return 0
  return round1((100 * n) / base)
}
