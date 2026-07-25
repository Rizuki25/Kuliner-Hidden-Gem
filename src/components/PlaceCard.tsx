import { ArrowUpRight, Clock3, MapPin, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { halalLabels, priceLabels, type Place } from '../types/place'

type PlaceCardProps = {
  place: Place
  compact?: boolean
  marketplace?: boolean
  onSelect?: (place: Place) => void
}

export function PlaceCard({ place, compact = false, marketplace = false, onSelect }: PlaceCardProps) {
  return (
    <motion.article
      className={`place-card${compact ? ' place-card--compact' : ''}${marketplace ? ' place-card--marketplace' : ''}`}
      whileHover={marketplace ? { y: -6 } : undefined}
      transition={{ duration: .28, ease: [.22, 1, .36, 1] }}
    >
      <motion.button
        className="place-card__visual"
        type="button"
        style={{
          background: `linear-gradient(135deg, ${place.accent}, ${marketplace ? '#f7f7f7' : '#272522'})`,
        }}
        onClick={() => onSelect?.(place)}
        aria-label={`Pilih ${place.name}`}
        whileTap={{ scale: .985 }}
      >
        {place.photoUrls?.[0] && <img className="place-card__photo" src={place.photoUrls[0]} alt={`Foto ${place.name}`} />}
        {place.photoUrls?.[0] && <span className="place-card__photo-wash" aria-hidden="true" />}
        <span className="place-card__noise" aria-hidden="true" />
        {!place.photoUrls?.[0] && <span className="place-card__emoji" aria-hidden="true">{place.emoji}</span>}
        <span className="place-card__eyebrow">{place.category}</span>
        <span className="place-card__halal">{halalLabels[place.halalStatus]}</span>
        <span className="place-card__visual-caption" aria-hidden="true">
          <MapPin size={12} /> {place.area}
        </span>
      </motion.button>

      <div className="place-card__body">
        <div className="place-card__heading">
          <div>
            <p className="place-card__area">{place.area}</p>
            <h3>{place.name}</h3>
          </div>
          <span className="rating" aria-label={`Rating ${place.rating} dari 5, ${place.reviewCount} ulasan`}><Star size={13} fill="currentColor" /> {place.rating} <small>({place.reviewCount})</small></span>
        </div>
        <p className="place-card__tagline">{place.tagline}</p>
        <div className="place-card__meta">
          <span><MapPin size={13} /> {place.distanceKm === undefined ? 'Bandung' : `${place.distanceKm.toFixed(1)} km`}</span>
          <span className={place.isOpen ? 'is-open' : 'is-closed'}><Clock3 size={13} /> {place.isOpen ? 'Buka sekarang' : 'Tutup'}</span>
        </div>
        <div className="place-card__footer">
          <span className="place-card__price">{priceLabels[place.priceRange]}</span>
          <Link className="text-link" to={`/tempat/${place.id}`}>
            Lihat detail <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
