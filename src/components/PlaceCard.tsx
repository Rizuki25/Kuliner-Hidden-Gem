import { ArrowUpRight, Clock3, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { halalLabels, type Place } from '../types/place'

type PlaceCardProps = {
  place: Place
  compact?: boolean
  marketplace?: boolean
  onSelect?: (place: Place) => void
}

export function PlaceCard({ place, compact = false, marketplace = false, onSelect }: PlaceCardProps) {
  return (
    <article className={`place-card${compact ? ' place-card--compact' : ''}${marketplace ? ' place-card--marketplace' : ''}`}>
      <button
        className="place-card__visual"
        type="button"
        style={{
          background: marketplace && !place.photoUrls?.[0]
            ? '#f2f2f2'
            : `linear-gradient(135deg, ${place.accent}, #272522)`,
        }}
        onClick={() => onSelect?.(place)}
        aria-label={`Pilih ${place.name}`}
      >
        {place.photoUrls?.[0] && <img className="place-card__photo" src={place.photoUrls[0]} alt={`Foto ${place.name}`} />}
        {place.photoUrls?.[0] && <span className="place-card__photo-wash" aria-hidden="true" />}
        <span className="place-card__noise" />
        {!place.photoUrls?.[0] && <span className="place-card__emoji" aria-hidden="true">{place.emoji}</span>}
        <span className="place-card__eyebrow">{place.category}</span>
        <span className="place-card__halal">{halalLabels[place.halalStatus]}</span>
      </button>

      <div className="place-card__body">
        <div className="place-card__heading">
          <div>
            <p className="place-card__area">{place.area}</p>
            <h3>{place.name}</h3>
          </div>
          <span className="rating"><Star size={13} fill="currentColor" /> {place.rating}</span>
        </div>
        <p className="place-card__tagline">{place.tagline}</p>
        <div className="place-card__meta">
          <span><MapPin size={13} /> {place.distanceKm === undefined ? 'Bandung' : `${place.distanceKm.toFixed(1)} km`}</span>
          <span className={place.isOpen ? 'is-open' : 'is-closed'}><Clock3 size={13} /> {place.isOpen ? 'Buka sekarang' : 'Tutup'}</span>
        </div>
        <Link className="text-link" to={`/tempat/${place.id}`}>
          Lihat detail <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  )
}
