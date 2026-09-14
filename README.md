# Tracking Municipal — Camaçari 2026

Painel analítico em React com a mesma estrutura do relatório HTML (temas · perguntas · resultados).

## Como rodar

```bash
cd tracking-camacari
npm install
npm run dev
```

## Regenerar dados do Excel

Na pasta raiz do projeto (onde está o `.xlsx`):

```bash
python _build_data.py
```

Isso atualiza `src/data/resultados.json` e `public/data/resultados.json`.

## Estrutura

- Esquerda: temas do questionário
- Centro: perguntas do tema
- Direita: KPIs + gráficos (barras / pizza / linha por dia) + tabela
