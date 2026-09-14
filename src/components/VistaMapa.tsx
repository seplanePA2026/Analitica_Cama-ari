import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { MapaPonto } from '../types'
import 'leaflet/dist/leaflet.css'

type Props = {
  pontos: MapaPonto[]
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

export function VistaMapa({ pontos }: Props) {
  const center: [number, number] = pontos.length
    ? [
        pontos.reduce((s, p) => s + p.lat, 0) / pontos.length,
        pontos.reduce((s, p) => s + p.lng, 0) / pontos.length,
      ]
    : [-12.7, -38.32]

  return (
    <div className="vista vista-mapa">
      <div className="vista-toolbar">
        <span className="meta">Pontos de entrevista em Camaçari</span>
      </div>
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
    </div>
  )
}
