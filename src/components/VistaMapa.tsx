import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { MapaPonto, Pergunta, Respondente } from '../types'
import { VistaMapaRegioes } from './VistaMapaRegioes'
import 'leaflet/dist/leaflet.css'

type Props = {
  pontos: MapaPonto[]
  respondentes: Respondente[]
  perguntas: Pergunta[]
  regioes: string[]
  datas: { iso: string; label: string }[]
}

function MapInvalidate() {
  const map = useMap()
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 50)
    const t2 = window.setTimeout(() => map.invalidateSize(), 300)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', onResize)
    }
  }, [map])
  return null
}

export function VistaMapa({ pontos, respondentes, perguntas, regioes, datas }: Props) {
  const [modo, setModo] = useState<'pontos' | 'regioes'>('regioes')
  const center: [number, number] = pontos.length
    ? [
        pontos.reduce((s, p) => s + p.lat, 0) / pontos.length,
        pontos.reduce((s, p) => s + p.lng, 0) / pontos.length,
      ]
    : [-12.7, -38.32]

  return (
    <div className={`vista vista-mapa${modo === 'regioes' ? ' is-regioes' : ''}`}>
      <div className="vista-toolbar">
        <span className="meta">
          {modo === 'pontos' ? 'Pontos de entrevista em Camaçari' : 'Resultados da pesquisa por região'}
        </span>
        <div className="tog mr-modo" role="group" aria-label="Tipo de mapa">
          <button type="button" aria-pressed={modo === 'pontos'} onClick={() => setModo('pontos')}>
            Pontos
          </button>
          <button type="button" aria-pressed={modo === 'regioes'} onClick={() => setModo('regioes')}>
            Regiões
          </button>
        </div>
      </div>
      {modo === 'regioes' ? (
        <VistaMapaRegioes
          pontos={pontos}
          respondentes={respondentes}
          perguntas={perguntas}
          regioes={regioes}
          datas={datas}
        />
      ) : (
      <div className="map-frame">
        <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <MapInvalidate />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pontos.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={5}
              pathOptions={{ color: '#8858f0', fillColor: '#8858f0', fillOpacity: 0.75, weight: 1 }}
            >
              <Popup>
                <strong>{p.regiao || 'Região'}</strong>
                <br />
                {p.sexo}
                {p.idade ? ` · ${p.idade}` : ''}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      )}
    </div>
  )
}
