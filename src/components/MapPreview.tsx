import { LocateFixed, Minus, Plus, Utensils } from 'lucide-react'
import type { Place } from '../types/place'

type MapPreviewProps = {
  places: Place[]
  selectedPlaceId?: string
  onSelect: (place: Place) => void
}

const markerPositions = [
  { left: '22%', top: '35%' },
  { left: '54%', top: '21%' },
  { left: '73%', top: '48%' },
  { left: '39%', top: '66%' },
  { left: '82%', top: '76%' },
  { left: '15%', top: '77%' },
]

export function MapPreview({ places, selectedPlaceId, onSelect }: MapPreviewProps) {
  return (
    <section className="map-panel" aria-label="Peta kuliner Bandung">
      <div className="map-panel__header">
        <div>
          <span className="section-kicker">PETA AREA</span>
          <h2>Jelajah Bandung</h2>
        </div>
        <span className="map-status"><span /> Live preview</span>
      </div>

      <div className="map-canvas">
        <div className="map-canvas__wash" />
        <div className="map-canvas__river" />
        <div className="map-road map-road--one" />
        <div className="map-road map-road--two" />
        <div className="map-road map-road--three" />
        <span className="map-label map-label--north">DAGO</span>
        <span className="map-label map-label--center">BRAGA</span>
        <span className="map-label map-label--south">CIBADUYUT</span>

        {places.map((place, index) => (
          <button
            className={`map-marker${selectedPlaceId === place.id ? ' is-selected' : ''}`}
            key={place.id}
            type="button"
            style={markerPositions[index % markerPositions.length]}
            onClick={() => onSelect(place)}
            aria-label={`Lihat ${place.name} di peta`}
          >
            <Utensils size={14} strokeWidth={2.5} />
          </button>
        ))}

        <div className="map-user-location" title="Lokasi perkiraan Bandung">
          <span />
        </div>
        <div className="map-controls" aria-label="Kontrol peta">
          <button type="button" aria-label="Perbesar peta"><Plus size={16} /></button>
          <button type="button" aria-label="Perkecil peta"><Minus size={16} /></button>
          <button type="button" aria-label="Gunakan lokasi saya"><LocateFixed size={16} /></button>
        </div>
        <span className="map-attribution">Pratinjau peta · Bandung</span>
      </div>
    </section>
  )
}
