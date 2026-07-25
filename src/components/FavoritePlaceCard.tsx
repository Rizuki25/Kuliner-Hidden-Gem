import { ArrowUpRight, Clock3, Heart, LoaderCircle, MapPin, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { halalLabels, priceLabels, type Place } from '../types/place'

type FavoritePlaceCardProps = {
  place: Place
  isRemoving?: boolean
  onRemove: (placeId: string) => void
}

export function FavoritePlaceCard({ place, isRemoving = false, onRemove }: FavoritePlaceCardProps) {
  const photo = place.photoUrls?.[0]

  return (
    <motion.article
      className="favorite-card"
      layout
      whileHover={{ y: -7 }}
      transition={{ duration: .3, ease: [.22, 1, .36, 1] }}
    >
      <Link
        className="favorite-card__visual"
        to={`/tempat/${place.id}`}
        style={{ background: `linear-gradient(135deg, ${place.accent}, #eee9df)` }}
        aria-label={`Lihat detail ${place.name}`}
      >
        {photo ? (
          <img className="favorite-card__photo" src={photo} alt={`Foto ${place.name}`} />
        ) : (
          <>
            <span className="favorite-card__orb favorite-card__orb--one" aria-hidden="true" />
            <span className="favorite-card__orb favorite-card__orb--two" aria-hidden="true" />
            <span className="favorite-card__emoji" aria-hidden="true">{place.emoji}</span>
          </>
        )}
        <span className="favorite-card__wash" aria-hidden="true" />
        <span className="favorite-card__texture" aria-hidden="true" />
        <span className="favorite-card__badge">{place.category}</span>
        <span className="favorite-card__location"><MapPin size={13} /> {place.area}</span>
      </Link>

      <motion.button
        className="favorite-card__save is-saved"
        type="button"
        aria-label={`Hapus ${place.name} dari favorit`}
        title="Hapus dari favorit"
        disabled={isRemoving}
        onClick={() => onRemove(place.id)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: .92 }}
      >
        {isRemoving
          ? <LoaderCircle size={17} className="spin" />
          : <Heart size={17} fill="currentColor" />}
      </motion.button>

      <div className="favorite-card__body">
        <div className="favorite-card__topline">
          <span>{halalLabels[place.halalStatus]}</span>
          <span className="favorite-card__rating" aria-label={`Rating ${place.rating} dari 5`}>
            <Star size={13} fill="currentColor" />
            <strong>{place.rating}</strong>
            <small>({place.reviewCount})</small>
          </span>
        </div>

        <Link className="favorite-card__title" to={`/tempat/${place.id}`}>
          <h2>{place.name}</h2>
        </Link>
        <p className="favorite-card__tagline">{place.tagline}</p>

        <div className="favorite-card__details">
          <span className={place.isOpen ? 'is-open' : 'is-closed'}>
            <Clock3 size={14} />
            {place.isOpen ? 'Buka sekarang' : 'Tutup'}
          </span>
          <span>
            <MapPin size={14} />
            {place.distanceKm === undefined ? 'Bandung' : `${place.distanceKm.toFixed(1)} km`}
          </span>
        </div>

        <footer className="favorite-card__footer">
          <span className="favorite-card__price">
            <small>Kisaran harga</small>
            <strong>{priceLabels[place.priceRange]}</strong>
          </span>
          <Link className="favorite-card__cta" to={`/tempat/${place.id}`}>
            Lihat detail <ArrowUpRight size={15} />
          </Link>
        </footer>
      </div>
    </motion.article>
  )
}
