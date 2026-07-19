import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, ExternalLink, Flag, Globe2, Heart, Instagram, MapPin, Phone, Share2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BusinessClaimCard } from '../components/BusinessClaimCard'
import { ReportContentButton } from '../components/ReportContentButton'
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
    return (
      <div className="page-width detail-loading">
        <span className="loading-dot" />
        Memuat detail tempat...
      </div>
    )
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
  const approvedPhotos = (place.photoRecords ?? []).filter((photo) => photo.url)
  const photoPool = approvedPhotos.length > 0
    ? approvedPhotos.map((photo) => ({ id: photo.id, url: photo.url as string, caption: photo.caption }))
    : (place.photoUrls ?? []).map((url, index) => ({ id: 'legacy-' + index, url, caption: null as string | null }))
  const galleryPhotos = photoPool.slice(0, 5)
  const heroPhoto = galleryPhotos[0]
  const sidePhotos = galleryPhotos.slice(1, 5)
  const isSaved = isFavorite(place.id)

  return (
    <div className="page-width detail-page">
      <nav className="detail-breadcrumb" aria-label="Jejak navigasi">
        <Link className="detail-breadcrumb__link" to="/"><ArrowLeft size={14} /> Jelajah</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span>{place.area}</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>{place.name}</strong>
      </nav>

      <header className="detail-heading">
        <div className="detail-heading__copy">
          <h1>{place.name}</h1>
          <div className="detail-heading__meta">
            <span className="detail-heading__rating">
              <Star size={14} fill="currentColor" aria-hidden="true" />
              <strong>{place.rating}</strong>
              <span>({place.reviewCount} ulasan)</span>
            </span>
            <span className="detail-heading__dot" aria-hidden="true">·</span>
            <span className="detail-heading__area"><MapPin size={14} aria-hidden="true" /> {place.area}, Bandung</span>
            <span className="detail-heading__dot" aria-hidden="true">·</span>
            <span className={'detail-heading__status' + (place.isOpen ? ' is-open' : ' is-closed')}>
              <span aria-hidden="true" /> {place.isOpen ? 'Buka sekarang' : 'Sedang tutup'}
            </span>
          </div>
        </div>
        <div className="detail-heading__actions">
          <button
            className={'detail-icon-button' + (isSaved ? ' is-saved' : '')}
            type="button"
            onClick={() => void handleFavoriteToggle()}
            disabled={favoritesLoading}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          >
            <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
          </button>
          <a className="detail-icon-button" href={routeUrl} target="_blank" rel="noreferrer">
            <Share2 size={16} aria-hidden="true" />
            <span>Rute</span>
          </a>
        </div>
      </header>
      {favoriteError && <div className="data-notice data-notice--error detail-action-error" role="alert">Favorit gagal disimpan: {favoriteError}</div>}

      <section className="detail-gallery" aria-label={'Galeri foto ' + place.name}>
        <div className="detail-gallery__main" style={{ background: 'linear-gradient(135deg, ' + place.accent + ', #282522)' }}>
          {heroPhoto && <img src={heroPhoto.url} alt={'Foto utama ' + place.name} />}
          {!heroPhoto && <span className="detail-gallery__emoji" aria-hidden="true">{place.emoji}</span>}
        </div>
        <div className="detail-gallery__grid">
          {sidePhotos.map((photo, index) => (
            <figure key={photo.id} className="detail-gallery__cell">
              <img src={photo.url} alt={photo.caption ?? 'Foto ' + place.name + ' ' + (index + 2)} loading="lazy" />
              {index === sidePhotos.length - 1 && photoPool.length > 5 && (
                <span className="detail-gallery__more">+{photoPool.length - 5} foto</span>
              )}
            </figure>
          ))}
          {sidePhotos.length === 0 && (
            <div className="detail-gallery__cell detail-gallery__cell--placeholder" aria-hidden="true">
              <span>{place.emoji}</span>
            </div>
          )}
        </div>
        <span className="detail-gallery__badge">
          <Star size={11} fill="currentColor" aria-hidden="true" /> Favorit komunitas
        </span>
      </section>

      <section className="detail-content-grid">
        <div className="detail-main-column">
          <div className="detail-host-row">
            <div className="detail-host-row__copy">
              <h2>{place.tagline}</h2>
              <p>{halalLabels[place.halalStatus]} · {place.category} · {priceLabels[place.priceRange]}</p>
            </div>
            <span className="detail-host-row__avatar" aria-hidden="true">{place.emoji}</span>
          </div>

          <div className="detail-rating-hero">
            <div className="detail-rating-hero__score">
              <span className="detail-rating-hero__laurel" aria-hidden="true">❦</span>
              <strong>{place.rating}</strong>
              <span className="detail-rating-hero__laurel detail-rating-hero__laurel--flip" aria-hidden="true">❦</span>
            </div>
            <p className="detail-rating-hero__tagline">Disukai pengunjung</p>
            <p className="detail-rating-hero__sub">Berdasarkan {place.reviewCount} ulasan komunitas terverifikasi</p>
            <a className="text-link" href="#ulasan-komunitas">Lihat semua ulasan</a>
          </div>

          <div className="detail-section">
            <h2 className="detail-section__title">Alasan untuk mampir</h2>
            <p className="detail-description">{place.description}</p>
            <ul className="detail-amenity-list">
              {place.highlights.map((highlight) => (
                <li key={highlight}>
                  <span className="detail-amenity-list__icon"><Check size={15} /></span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <ReviewsSection placeId={place.id} onChanged={() => void loadPlace()} />
          <BusinessClaimCard placeId={place.id} />

          <div className="detail-report-actions">
            <Flag size={13} aria-hidden="true" />
            <span>Menemukan masalah?</span>
            <ReportContentButton entityType="place" entityId={place.id} entityLabel="tempat ini" />
            {heroPhoto && approvedPhotos.length > 0 && (
              <ReportContentButton variant="photo" entityType="place_photo" entityId={heroPhoto.id} entityLabel="foto tempat ini" />
            )}
          </div>
        </div>

        <aside className="detail-side-column">
          <div className="detail-sticky-card">
            <div className="detail-sticky-card__price">
              <span>{priceLabels[place.priceRange]}</span>
              <small>per orang</small>
            </div>

            <div className="detail-sticky-card__status">
              <span className={'status-pill ' + (place.isOpen ? 'status-pill--open' : 'status-pill--closed')}>
                <span /> {place.isOpen ? 'Buka sekarang' : 'Tutup sekarang'}
              </span>
              <span className="label-pill">{halalLabels[place.halalStatus]}</span>
            </div>

            <a className="button button--primary button--full" href={routeUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" /> Dapatkan rute
            </a>
            <button
              className={'button button--secondary button--full' + (isSaved ? ' is-saved' : '')}
              type="button"
              onClick={() => void handleFavoriteToggle()}
              disabled={favoritesLoading}
            >
              <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
              {isSaved ? 'Tersimpan di favorit' : 'Simpan ke favorit'}
            </button>

            <p className="detail-sticky-card__note">Gratis untuk dikunjungi — kamu hanya membayar apa yang kamu pesan.</p>

            <div className="detail-info-list">
              <div className="detail-info-list__row">
                <MapPin size={16} aria-hidden="true" />
                <div>
                  <span>Alamat</span>
                  <strong>{place.address}</strong>
                </div>
              </div>
              <div className="detail-info-list__row">
                <CalendarDays size={16} aria-hidden="true" />
                <div>
                  <span>Area</span>
                  <strong>{place.area}, Bandung</strong>
                </div>
              </div>
              {place.phone && (
                <div className="detail-info-list__row">
                  <Phone size={16} aria-hidden="true" />
                  <div>
                    <span>Kontak</span>
                    <a href={'tel:' + place.phone}><strong>{place.phone}</strong></a>
                  </div>
                </div>
              )}
              {place.websiteUrl && (
                <div className="detail-info-list__row">
                  <Globe2 size={16} aria-hidden="true" />
                  <div>
                    <span>Website</span>
                    <a href={place.websiteUrl} target="_blank" rel="noreferrer"><strong>{place.websiteUrl}</strong></a>
                  </div>
                </div>
              )}
              {place.instagramUrl && (
                <div className="detail-info-list__row">
                  <Instagram size={16} aria-hidden="true" />
                  <div>
                    <span>Instagram</span>
                    <a href={place.instagramUrl} target="_blank" rel="noreferrer"><strong>{place.instagramUrl}</strong></a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="detail-hours-card">
            <div className="detail-hours-card__heading">
              <Clock3 size={16} aria-hidden="true" />
              <h2>Jam buka</h2>
            </div>
            <div className="detail-hours-list">
              {dayOrder.map((day) => {
                const hours = place.openingHours[day]
                return (
                  <div className="detail-hours-list__row" key={day}>
                    <span>{dayLabels[day]}</span>
                    <strong className={hours.closed ? 'is-closed' : ''}>{hours.closed ? 'Tutup' : hours.open + ' – ' + hours.close}</strong>
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
