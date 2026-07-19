import L from 'leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

type LocationPickerProps = {
  latitude: number
  longitude: number
  onChange: (latitude: number, longitude: number) => void
}

const pickerZoom = 16

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: pickerZoom,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.marker([latitude, longitude], { draggable: true, title: 'Titik tempat' }).addTo(map)
    marker.bindTooltip('Klik peta atau geser pin ke lokasi yang paling tepat', { direction: 'top', offset: [0, -10] })
    marker.on('dragend', () => {
      const position = marker.getLatLng()
      onChangeRef.current(position.lat, position.lng)
    })
    map.on('click', (event) => {
      marker.setLatLng(event.latlng)
      onChangeRef.current(event.latlng.lat, event.latlng.lng)
    })

    mapRef.current = map
    markerRef.current = marker
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      window.clearTimeout(resizeTimer)
      markerRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return

    const nextPosition: L.LatLngExpression = [latitude, longitude]
    marker.setLatLng(nextPosition)
    map.setView(nextPosition, Math.max(map.getZoom(), pickerZoom), { animate: false })
  }, [latitude, longitude])

  return <div className="location-picker__map" ref={containerRef} aria-label="Pilih titik lokasi tempat dengan mengeklik peta atau menggeser pin" />
}
