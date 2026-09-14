/** Composição oficial das regiões da pesquisa — Tracking Camaçari 2026 */

export type RegiaoInfo = {
  id: string
  titulo: string
  cor: string
  corTexto: string
  bairros: string[]
}

export const REGIOES_INFO: RegiaoInfo[] = [
  {
    id: 'Região 1',
    titulo: 'Região 1 / SEDE',
    cor: '#e8c547',
    corTexto: '#5c4a00',
    bairros: [
      'Alto da Bela Vista',
      'Bela Vista',
      'Centro',
      'Dois de Julho',
      'Industrial',
      'Massaranduba',
      'Nova Vitória',
      'Novo Horizonte',
      'Parafuso',
      'Parque Verde II',
      'Parque Verde III',
      'Piaçaveira',
      'Polo de Apoio',
      'Ponto Certo',
      'Rio da Prata',
      'Verdes Horizontes',
      'Vívea',
    ],
  },
  {
    id: 'Região 2',
    titulo: 'Região 2 / SEDE',
    cor: '#b794f6',
    corTexto: '#3b1d6e',
    bairros: [
      'Acajutiba',
      'Alto da Cruz',
      'Alto do Triângulo',
      'Burisatuba',
      'Camaçari de Dentro',
      'Centro',
      'Cristo Redentor',
      'FICAM',
      'Gleba A',
      'Gleba B',
      'Gleba C',
      'Gleba E',
      'Gleba H',
      'Gravatá',
      'Jardim Brasília',
      'Lama Preta',
      'Mangueiral',
      'Natal',
      'Nova Aliança - PHOC I',
      'Parque Satélite',
      'Parque Verde I',
      'Parque Verde II',
      'Parque Verde III',
      'Quarenta e Seis',
      'Recanto das Árvores',
      'Renascer - PHOC II',
      'Rio da Prata',
      'Santa Maria',
      'Santo Antônio',
      'Tancredo Neves - PHOC III',
      'Vila Goiana',
    ],
  },
  {
    id: 'Região 3',
    titulo: 'Região 3 / SEDE',
    cor: '#e53e3e',
    corTexto: '#ffffff',
    bairros: [
      'Jardim Limoeiro',
      'Loteamento Montenegro',
      'Machadinho',
      'Parque das Mangabas',
      'Parque das Palmeiras',
      'Parque Nascente do Rio Capivara',
      'Parque Real Serra Verde',
      'Polo Logístico',
      'Poloplast',
    ],
  },
  {
    id: 'Região 4',
    titulo: 'Região 4 — Distrito de Abrantes',
    cor: '#ed8936',
    corTexto: '#ffffff',
    bairros: [
      'Alphaville',
      'Areias',
      'Arembepe',
      'Boa União',
      'Busca Vida',
      'Cajazeiras de Abrantes',
      'Cascalheira',
      'Catu de Abrantes',
      'Coqueiros de Arembepe',
      'Interlagos',
      'Jauá',
      'Malícia',
      'Nova Abrantes',
      'Parque das Dunas',
      'Pé de Areia',
      'Vale do Landirana',
      'Vargem Grande',
      'Vila de Abrantes',
    ],
  },
  {
    id: 'Região 5',
    titulo: 'Região 5 — Distrito de Monte Gordo',
    cor: '#38a169',
    corTexto: '#ffffff',
    bairros: [
      'Barra do Jacuípe',
      'Barra do Pojuca',
      'Boa Esperança',
      'Coqueiros de Monte Gordo',
      'Genipabu',
      'Guarajuba',
      'Itacimirim',
      'Monte Gordo',
      'São Bento',
      'Várzea da Meira',
    ],
  },
]

export function infoRegiao(id: string): RegiaoInfo | undefined {
  return REGIOES_INFO.find((r) => r.id === id)
}

export function normalizaNome(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/** Confere se o nome do polígono (malha) corresponde a algum bairro da lista oficial. */
export function bairroPertenceALista(nomeMalha: string, lista: string[]) {
  const n = normalizaNome(nomeMalha)
  if (!n) return false
  return lista.some((oficial) => {
    const o = normalizaNome(oficial)
    return n === o || n.includes(o) || o.includes(n)
  })
}
