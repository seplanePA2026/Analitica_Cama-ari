# Auditoria do painel — Tracking Municipal Camaçari 2026

**Data:** 14/09/2026
**Escopo:** integridade dos dados, cálculos e resultados em todas as telas; usabilidade (botões, filtros, menus, modais, teclado, mapa); tamanhos de tela; exportações.
**Base de referência:** `BD Camaçari_tracking_26_.xlsx` (593 entrevistas, coleta de 09 a 13/09/2026).

> Nenhuma correção foi aplicada durante a auditoria. Os itens da seção 3 aguardam decisão.

---

## 1. Resumo

**Os números estão corretos e iguais em todas as telas e em todos os tamanhos de tela.** Todos os valores exibidos foram recalculados de forma independente, em Python, a partir da planilha original. Não há erro de contagem em nenhuma tela.

Os problemas encontrados estão em:

- **Exportações:** Excel do Relatório não é gerado; filtros invisíveis entram no arquivo; PDF omite respostas e colunas.
- **Textos de leitura:** duas perguntas apontam o 1º colocado errado.
- **Arredondamento:** 20 células de cruzamento diferem em 0,1 ponto de outra tela.
- **Celular:** conteúdo cortado em 390 px.
- **Privacidade:** login sem validação e coordenadas das entrevistas acessíveis sem login.

---

## 2. O que foi conferido

| Área | Verificação | Resultado |
|---|---|---|
| Base de dados | Planilha × dados do app: respostas das 41 perguntas, datas, dias da semana, coordenadas, 593 linhas | 0 divergências |
| Listas | 41 perguntas × 180 combinações dos filtros Sexo/Faixa etária/Escolaridade (7.380 casos), incluindo linha por dia; 25 valores lidos na tela | idênticos |
| Relatório | 41 perguntas × 671 combinações de filtros (27.511 casos); 35 valores de tabela e barra lidos na tela; contadores de entrevistas | idênticos |
| Cruzamentos | 12.522 células (contagens, totais de grupo, percentuais) | contagens corretas; 20 percentuais com arredondamento diferente (item 6) |
| Mapa por regiões | 330 conferências: total, % por região, diferença em p.p., base, rótulos do mapa; comparação A/B; camada de pontos | idênticos |
| Acumulativo | 19 indicadores × 18 cenários na função; 692 conferências na tela (total, cards, colunas acumuladas por dia, totais) | idênticos |
| Tabela | 593 linhas × 41 colunas célula por célula; busca; ordenação; 15 páginas | idênticos |
| Consistência entre telas | ACM Neto 46,2% · 274 (Feminino: 42% · 134; Região 3: 49,2% · 58) em Listas, Relatório, Mapa, Acumulativo e cruzamento | idênticos |
| Tamanhos de tela | 390, 768, 1024, 1280 e 1920 px, com os mesmos valores em todas | idênticos |
| Usabilidade | abas, menu de exportação, menu do usuário, modais (Esc, clique no fundo, X), filtros e Limpar, gavetas de filtro e seletores no celular, legendas que ligam/desligam, navegação por setas, popups e cliques do mapa | funcionam |
| Arredondamento | as duas fórmulas usadas no app (Acumulativo e demais telas) comparadas em 180.900 pares n/base | equivalentes |

**Não testado:**

- **Botão Sair:** exigiria digitar usuário e senha para voltar.
- **Downloads reais:** os arquivos foram capturados e lidos dentro da página, sem salvar em disco.
- **PDF da aba Tabela:** não foi gerado; o item 4 vem da leitura do código.

---

## 3. Achados

### Críticos

**1. Exportar Excel não gera arquivo fora da aba Tabela**
- **Onde:** `src/lib/export.ts`, função `exportRelatorioExcel`.
- **Causa:** o nome de cada aba da planilha é cortado em 28 caracteres, e 4 pares de perguntas ficam com o mesmo nome. A biblioteca recusa nomes repetidos e a exportação para com o erro `Worksheet with name |Candidato a governador apoia| already exists!`.
  - "Candidato a governador apoiado por Lula" / "… por Flávio Bolsonaro"
  - "Intenção de voto para Governador (espontânea)" / "(estimulada)"
  - "Intenção de voto para Senador — 1ª opção" / "2ª opção"
  - "Intenção de voto para Deputado Federal" / "Deputado Estadual"
- **Efeito:** nas abas Mapa, Listas, Relatório e Acumulativo, "Exportar Excel" não faz nada. Na aba Tabela funciona (593 linhas, 41 colunas, 0 divergências).

**2. Exportações usam filtros invisíveis**
- **Onde:** `src/App.tsx` (`onExportExcel` e `onExportPdf` usam `perguntasFiltradas`, que vem dos filtros do Relatório).
- **Teste:** "Sexo = Feminino" ligado no Relatório; ida para a aba Listas, sem nenhum filtro na tela; PDF exportado. O arquivo saiu com "319 entrevistas" e só os resultados das mulheres.
- **Efeito contrário:** os filtros da aba Listas (Faixa etária, Sexo, Escolaridade) não entram na exportação.

### Altos

**3. PDF do Relatório omite respostas**
- **Onde:** `exportRelatorioPdfBranded` (`items.slice(0, 8)` nas barras e na tabela; rótulos cortados em 22 caracteres).
- **Efeito:** no máximo 8 respostas por pergunta, sem linha "Outros" e sem aviso. Os percentuais não somam 100%. Faltam 35 das 276 respostas, por exemplo 7 das 15 de Deputado Estadual, 5 das 16 de Deputado Federal e candidatos menores de Presidente e Senado.
- **Conferido:** os 228 valores que aparecem no PDF estão corretos.

**4. PDF da aba Tabela leva só 16 das 41 colunas**
- **Onde:** `exportTabelaPdfBranded` (`clean.columns.slice(0, 16)`).

**5. Texto de leitura e card de 1º colocado errados**
- **Onde:** `src/components/ResultadoPanel.tsx`. O texto e os cards usam a ordem dos itens, e duas perguntas vêm na ordem das categorias, não por quantidade.
- **Na tela:**
  - Avaliação da administração Caetano: "**Ótimo lidera com 9,4%**, seguido de Bom com 22,4%" e card "1º colocado 9,4% · Ótimo". O maior é **Regular, com 39,5%**.
  - Faixa etária: "**16 a 17 anos lidera com 0,3%**". O maior é **25 a 44 anos, com 42,7%**.
  - Empates: "Região 2 lidera com 20,2%, seguido de Região 4 com 20,2%" (120 cada); o mesmo acontece em Dia (Quinta-feira = Sábado, 120).

### Médios

**6. Arredondamento diferente entre telas (0,1 ponto)**
- **Causa:** os dados pré-gerados (`resultados.json`, gerado em Python) arredondam empates para o par (6,25 → 6,2). As telas que recalculam no navegador (filtros, Mapa, Acumulativo) arredondam para cima (6,25 → 6,3).
- **Na tela:** Flávio Bolsonaro entre Evangélicos Batistas aparece com **31,2%** no cruzamento de "Intenção de voto para Presidente" e **31,3%** no Relatório filtrado por essa religião. São os mesmos 15 de 48 entrevistados.
- **Abrangência:** 20 células de cruzamento, todas do grupo "Evangélico Batista/ Presbiteriano/ Metodista/ Luterano" (48 entrevistas). Nenhum resultado geral nem linha por dia tem esse empate.

**7. Celular (390 px): conteúdo cortado à direita**
- **Causa:** a barra de abas (Mapa · Listas · Relatório · Tabela · Acumulativo) precisa de 402 px e alarga o app inteiro. Como a página não rola na horizontal, cerca de 12 px ficam cortados em todas as telas (bordas do mapa, cards e botões).
- 768, 1024, 1280 e 1920 px estão corretos.

**8. Privacidade e acesso**
- O login aceita qualquer usuário e senha (`LoginScreen.tsx` não valida credencial).
- `/data/resultados.json` abre sem login (status 200) e contém as coordenadas das 593 entrevistas com 6 casas decimais, precisão de centímetros. Se o painel for publicado (`npm run deploy`), isso fica acessível a qualquer pessoa.

### Baixos

**9. Entrevista nº 523 com coordenada 0,0**
- No mapa de Pontos ela aparece no oceano, perto da África, e desloca o centro calculado do mapa. No mapa por regiões ela é ignorada (592 pontos).

**10. Textos**
- **Acumulativo:** "542 **votos** nos 3 principais" inclui "Nenhum desses" (274 + 238 + 30) e a palavra "votos" aparece também em aprovação e avaliação.
- **PDF:** "Gerado em 14/09/2026 10:51" é a data de geração dos dados, não a da exportação.

**11. Ordem das respostas diferente entre telas**
- No Relatório com filtro, todas as perguntas passam a ser ordenadas por quantidade, e as faixas etárias saem da ordem natural. Na aba Listas, com filtro, a ordem original é mantida. Os valores são os mesmos; só a ordem muda.

**12. Dependências e documentação**
- `xlsx` 0.18.5 tem 2 alertas de segurança, de severidade alta, sem correção disponível (GHSA-4r6h-8v6p-xvw6 e GHSA-5pgg-2g8v-p4x9). O risco é baixo neste uso, porque o app só gera planilhas e não abre arquivos enviados.
- O `README.md` manda entrar em `cd tracking-camacari` e rodar `python _build_data.py`, e o `package.json` aponta para `../_build_data.py`. Nem a pasta nem o script existem no projeto.

---

## 4. Alterações feitas no projeto nesta sessão (antes e durante a auditoria)

Todas foram pedidas e testadas no navegador.

**Aba Mapa**
- Mapa por **Regiões** como padrão, com o mapa de Pontos mantido.
  - Escolha de indicador e resposta; filtros de sexo, faixa etária, religião, escolaridade, renda e data; tabela por região e comparação A/B.
- Cores verde e vermelho em relação ao total do município, invertidas em respostas negativas (rejeição, desaprovação etc.).
- Contorno do município (IBGE); cor da região B em roxo; indicador "Dia da semana" retirado.
- Quadro do bairro: nome, região, número de entrevistas e bairro informado na pesquisa.
- **Arquivos novos:** `src/components/VistaMapaRegioes.tsx` e `src/data/regioes_pesquisa.json`.
- **Validação dos bairros:** a malha de regiões foi conferida pelos pontos GPS, pelo bairro digitado e pelas ruas informadas.
  - Arquivos gerados na pasta acima do projeto: `Camacari_Regioes_pesquisa_validacao.csv` e `Camacari_Regioes_pesquisa_validadas.gpkg`.
  - Parque Florestal mantido na Região 3 por decisão.

**Aba Listas**
- **Gráfico de barras:** rótulos completos, com quebra de linha em vez de corte; eixo termina no maior valor; grade só nos valores do eixo; o gráfico ocupa a altura da tela sem rolar a página.
- **Legendas:** gráficos de linha e de rosca permitem desligar nomes na legenda; o ícone "i" explica o recurso no gráfico de linha.
- **Quadro de valores:** o da linha é ordenado do maior para o menor.
- **Filtros:** Faixa etária, Sexo e Escolaridade ao lado dos botões de visualização, com botão Limpar e borda acesa quando ativos. O rótulo "Visualização" foi retirado.
  - **Arquivo novo:** `src/lib/filtroPergunta.ts`.
- **Região da entrevista:** gráfico e tabela em ordem Região 1 → 5.

**Ambiente**
- `npm install` executado, o que alterou `package-lock.json`.

---

## 5. Método

1. **Referência independente:** todos os números esperados foram calculados em Python direto da planilha `.xlsx`, sem usar o código do app.
2. **Funções de cálculo do app:** os módulos reais do app (`filters.ts`, `filtroPergunta.ts`, `acumulativo.ts`) foram executados no navegador com os mesmos cenários e comparados por assinatura (SHA-256) por pergunta.
3. **Telas:** os valores foram lidos diretamente das telas (tabelas, barras, cards, rótulos do mapa, quadros de valores) e comparados com a referência.
4. **Exportações:** os arquivos foram capturados dentro da página, sem download, e lidos: Excel com a própria biblioteca `xlsx`, PDF descompactado e conferido pelo texto.
5. **Tamanhos de tela:** o app foi aberto em iframes de 390, 768, 1024, 1280 e 1920 px; em cada um foram medidos vazamentos de largura e lidos os mesmos indicadores.
