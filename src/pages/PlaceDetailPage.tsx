import { ArrowLeft, CalendarDays, Check, Clock3, ExternalLink, Globe2, Heart, Instagram, MapPin, Phone, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BusinessClaimCard } from '../components/BusinessClaimCard'
import { ReviewsSection } from '../components/ReviewsSection'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { fetchPlaceById } from '../lib/places'
import type { Place } from '../types/place'
import { dayLabels, dayOrder, halalLabels, priceLabels } from '../types/place'
import { NotFoundPage } from './NotFoundPage'

export function PlaceDetailPage() {
  const { placeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorite, loading: favoritesLoading, toggleFavorite } = useFavorites()
  const [place, setPlace] = useState<Place>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>()
  const [favoriteError, setFavoriteError] = useState<string>()

  async function loadPlace() {
    setIsLoading(true)
    setPlace(undefined)
    setLoadError(undefined)

    if (!placeId) {
      setIsLoading(false)
      return
    }

    const result = await fetchPlaceById(placeId)
    setPlace(result.place)
    setLoadError(result.error)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadPlace()
  }, [placeId])

  async function handleFavoriteToggle() {
    if (!place) return

    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/tempat/' + place.id))
      return
    }

    setFavoriteError(undefined)
    const result = await toggleFavorite(place.id)
    if (result.error) setFavoriteError(result.error)
  }

  if (isLoading) {
    return <div className="page-width detail-loading">Memuat detail tempat...</div>
  }

  if (!place) {
    if (loadError) {
      return (
        <div className="page-width detail-loading detail-loading--error">
          Detail tempat gagal dimuat. Pastikan konfigurasi Supabase dan policy RLS sudah benar.<br />
          <small>{loadError}</small>
        </div>
      )
    }
    return <NotFoundPage />
  }

  const routeUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + place.lat + ',' + place.lng

  return (
    <div className="page-width detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link>

      <section className="detail-hero">
        <div className="detail-hero__visual" style={{ background: 'linear-gradient(135deg, ' + place.accent + ', #282522)' }}>
          {place.photoUrls?.[0] && <img className="detail-hero__photo" src={place.photoUrls[0]} alt={'Foto ' + place.name} />}
          {place.photoUrls?.[0] && <span className="detail-hero__photo-wash" aria-hidden="true" />}
          <span className="place-card__noise" />
          {!place.photoUrls?.[0] && <span className="detail-hero__emoji" aria-hidden="true">{place.emoji}</span>}
          <span className="detail-hero__stamp">BANDUNG<br /><small>LOCAL FIND</small></span>
        </div>
        <div className="detail-hero__copy">
          <div className="eyebrow-row"><MapPin size={15} /> {place.area} · Bandung</div>
          <h1>{place.name}</h1>
          <p className="detail-hero__tagline">{place.tagline}</p>
          <div className="detail-badges">
            <span className={'status-pill ' + (place.isOpen ? 'status-pill--open' : 'status-pill--closed')}>
              <span /> {place.isOpen ? 'Buka sekarang' : 'Tutup sekarang'}
            </span>
            <span className="label-pill">{halalLabels[place.halalStatus]}</span>
            <span className="label-pill">{place.category}</span>
          </div>
          <div className="detail-actions">
            <a className="button button--primary" href={routeUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Dapatkan rute
            </a>
            <button
              className={'button button--secondary favorite-button' + (isFavorite(place.id) ? ' is-saved' : '')}
              type="button"
              onClick={() => void handleFavoriteToggle()}
              disabled={favoritesLoading}
            >
              <Heart size={16} fill={isFavorite(place.id) ? 'currentColor' : 'none'} />
              {isFavorite(place.id) ? 'Tersimpan' : 'Simpan'}
            </button>
          </div>
          {favoriteError && <div className="data-notice data-notice--error detail-action-error" role="alert">Favorit gagal disimpan: {favoriteError}</div>}
        </div>
      </section>

      <section className="detail-content-grid">
        <div className="detail-main-column">
          <div className="detail-card detail-card--rating">
            <div className="rating-big"><Star size={20} fill="currentColor" /> <strong>{place.rating}</strong><span>/ 5</span></div>
            <div className="rating-copy"><strong>Disukai pengunjung</strong><span>{place.reviewCount} ulasan komunitas</span></div>
            <a className="text-link" href="#ulasan-komunitas">Tulis ulasan ↗</a>
          </div>

          <div className="detail-card">
            <div className="detail-card__heading"><span className="section-kicker">TENTANG TEMPAT</span><h2>Alasan untuk mampir</h2></div>
            <p className="detail-description">{place.description}</p>
            <div className="highlight-list">
              {place.highlights.map((highlight) => <span key={highlight}><Check size={14} /> {highlight}</span>)}
            </div>
          </div>

          <ReviewsSection placeId={place.id} onChanged={() => void loadPlace()} />
          <BusinessClaimCard placeId={place.id} />
        </div>

        <aside className="detail-side-column">
          <div className="detail-card info-card">
            <div className="detail-card__heading"><span className="section-kicker">INFORMASI</span><h2>Rencanakan kunjungan</h2></div>
            <div className="info-row"><MapPin size={17} /><div><span>Alamat</span><strong>{place.address}</strong></div></div>
            <div className="info-row"><CalendarDays size={17} /><div><span>Area</span><strong>{place.area}, Bandung</strong></div></div>
            <div className="info-row"><Clock3 size={17} /><div><span>Perkiraan harga</span><strong>{priceLabels[place.priceRange]}</strong></div></div>
            {place.phone && <div className="info-row"><Phone size={17} /><div><span>Kontak</span><a href={`tel:${place.phone}`}><strong>{place.phone}</strong></a></div></div>}
            {place.websiteUrl && <div className="info-row"><Globe2 size={17} /><div><span>Website</span><a href={place.websiteUrl} target="_blank" rel="noreferrer"><strong>{place.websiteUrl}</strong></a></div></div>}
            {place.instagramUrl && <div className="info-row"><Instagram size={17} /><div><span>Instagram</span><a href={place.instagramUrl} target="_blank" rel="noreferrer"><strong>{place.instagramUrl}</strong></a></div></div>}
          </div>

          <div className="detail-card hours-card">
            <div className="detail-card__heading"><span className="section-kicker">JAM BUKA</span><h2>Datang di waktu yang tepat</h2></div>
            <div className="hours-list">
              {dayOrder.map((day) => {
                const hours = place.openingHours[day]
                return (
                  <div className="hours-row" key={day}>
                    <span>{dayLabels[day]}</span>
                    <strong>{hours.closed ? 'Tutup' : hours.open + ' – ' + hours.close}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
