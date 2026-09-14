# Tracking Municipal — Camaçari 2026

Painel analítico em React (Vite) com temas, perguntas, mapa, relatório, tabela e acumulativo.

## Como rodar

Na raiz deste repositório:

```bash
npm install
npm run dev
```

## Dados

Os resultados agregados estão em `src/data/resultados.json` (importados pelo app no build).

Fontes de referência no repositório:

- `bd-camacari-resultados.xlsx`
- `QUESTIONÁRIO CODIFICADO  TRACKING  CAMAÇARI   2026.docx`

Não há cópia pública em `/data/` — o JSON não fica exposto via URL estática.

## Deploy

```bash
npm run build
npx wrangler deploy
```

## Estrutura

- Mapa: pontos e regiões
- Listas: temas · perguntas · KPIs · gráficos
- Relatório: cards + cruzamentos + filtros
- Tabela / Acumulativo / exportações Excel e PDF
