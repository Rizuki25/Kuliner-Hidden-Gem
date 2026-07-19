import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Place } from '../types/place'

type MapPreviewProps = {
  places: Place[]
  selectedPlaceId?: string
  onSelect: (place: Place) => void
}

const BANDUNG_CENTER: L.LatLngExpression = [-6.9175, 107.6191]
const DEFAULT_ZOOM = 13

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character)
}

function createMarkerIcon(isSelected: boolean) {
  return L.divIcon({
    className: 'map-marker-icon',
    html: `<span class="map-marker-leaflet${isSelected ? ' is-selected' : ''}"><span class="map-marker-leaflet__dot"></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    tooltipAnchor: [0, -34],
  })
}

function createUserIcon() {
  return L.divIcon({
    className: 'map-user-icon',
    html: '<span class="map-user-location-leaflet"><span></span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export function MapPreview({ places, selectedPlaceId, onSelect }: MapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef(new Map<string, L.Marker>())
  const userMarkerRef = useRef<L.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  const [isReady, setIsReady] = useState(false)
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'active' | 'denied'>('idle')

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: BANDUNG_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const markerLayer = L.layerGroup().addTo(map)
    mapRef.current = map
    markerLayerRef.current = markerLayer
    setIsReady(true)

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      window.clearTimeout(resizeTimer)
      userMarkerRef.current = null
      markersRef.current.clear()
      markerLayerRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    if (!map || !markerLayer) return

    markerLayer.clearLayers()
    markersRef.current.clear()

    for (const place of places) {
      const marker = L.marker([place.lat, place.lng], {
        icon: createMarkerIcon(place.id === selectedPlaceId),
        title: place.name,
      })

      marker.bindTooltip(escapeHtml(place.name), {
        direction: 'top',
        offset: [0, -24],
        opacity: .95,
      })
      marker.on('click', () => onSelectRef.current(place))
      marker.addTo(markerLayer)
      markersRef.current.set(place.id, marker)
    }

    if (places.length === 0) {
      map.setView(BANDUNG_CENTER, DEFAULT_ZOOM)
      return
    }

    const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lng] as L.LatLngTuple))
    map.fitBounds(bounds.pad(.18), { maxZoom: 15, animate: false })
  }, [places])

  useEffect(() => {
    const map = mapRef.current
    const selectedMarker = selectedPlaceId ? markersRef.current.get(selectedPlaceId) : undefined

    markersRef.current.forEach((marker, placeId) => {
      marker.setIcon(createMarkerIcon(placeId === selectedPlaceId))
    })

    if (map && selectedMarker) {
      map.panTo(selectedMarker.getLatLng(), { animate: true, duration: .35 })
      selectedMarker.openTooltip()
    }
  }, [selectedPlaceId, places])

  function zoomIn() {
    mapRef.current?.zoomIn()
  }

  function zoomOut() {
    mapRef.current?.zoomOut()
  }

  function locateUser() {
    if (!navigator.geolocation || !mapRef.current) {
      setLocationState('denied')
      return
    }

    setLocationState('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location: L.LatLngExpression = [coords.latitude, coords.longitude]
        const map = mapRef.current
        if (!map) return

        userMarkerRef.current?.remove()
        userMarkerRef.current = L.marker(location, { icon: createUserIcon(), title: 'Lokasi saya' })
          .bindTooltip('Lokasi saya', { direction: 'top', offset: [0, -10] })
          .addTo(map)
        map.setView(location, 15, { animate: true })
        setLocationState('active')
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <section className="map-panel" aria-label="Peta kuliner Bandung">
      <div className="map-panel__header">
        <div>
          <span className="section-kicker">PETA AREA</span>
          <h2>Jelajah Bandung</h2>
        </div>
        <span className="map-status"><span /> {isReady ? 'Peta interaktif' : 'Memuat peta'}</span>
      </div>

      <div className="map-canvas map-canvas--interactive">
        <div className="map-container" ref={mapContainerRef} aria-label="Peta interaktif tempat kuliner" />
        {!isReady && <div className="map-loading">Memuat peta Bandung...</div>}
        <div className="map-controls" aria-label="Kontrol peta">
          <button type="button" aria-label="Perbesar peta" onClick={zoomIn}><Plus size={16} /></button>
          <button type="button" aria-label="Perkecil peta" onClick={zoomOut}><Minus size={16} /></button>
          <button type="button" aria-label="Gunakan lokasi saya" onClick={locateUser} disabled={locationState === 'loading'}><LocateFixed size={16} className={locationState === 'loading' ? 'spin' : undefined} /></button>
        </div>
        {locationState === 'denied' && <span className="map-location-message">Lokasi tidak tersedia</span>}
        {locationState === 'active' && <span className="map-location-message map-location-message--active">Lokasi ditemukan</span>}
      </div>
    </section>
  )
}
