export type ChartKind = 'bar' | 'donut' | 'line'

export type ResultItem = {
  label: string
  n: number
  pct: number
}

export type TrackingSeries = {
  series: string[]
  points: Array<Record<string, string | number>>
}

export type CruzCell = { n: number; pct: number }

export type Cruzamento = {
  colunas: string[]
  linhas: Array<Record<string, string | number | CruzCell> & { grupo: string; total: number }>
}

export type Pergunta = {
  id: string
  title: string
  tema: string
  chart: ChartKind
  header: string
  n: number
  items: ResultItem[]
  tracking?: TrackingSeries
  cruzamentos: Record<string, Cruzamento>
  grupo?: string | null
}

export type CruzDim = { id: string; label: string }

export type TabelaData = {
  columns: string[]
  rows: Array<Record<string, string | number>>
}

export type MapaPonto = {
  lat: number
  lng: number
  regiao: string
  sexo: string
  idade: string
}

export type Respondente = {
  data: string
  data_label: string
  regiao: string
  sexo: string
  idade: string
  religiao: string
  [key: string]: string
}

export type AcumOpcao = {
  id: string
  label: string
  title: string
}

export type Resultados = {
  meta: {
    titulo: string
    subtitulo: string
    n_entrevistas: number
    n_perguntas: number
    n_temas: number
    folha: string
    gerado_em: string
    fonte: string
  }
  temas: string[]
  perguntas: Pergunta[]
  cruz_dims: CruzDim[]
  tabela: TabelaData
  mapa: MapaPonto[]
  respondentes: Respondente[]
  acum_opcoes: AcumOpcao[]
  filtros: {
    regioes: string[]
    datas: { iso: string; label: string }[]
  }
}

export type Aba = 'mapa' | 'lista' | 'relatorio' | 'tabela' | 'acumulativo'
