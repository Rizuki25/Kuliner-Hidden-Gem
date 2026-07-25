import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Flag,
  Globe2,
  Heart,
  Images,
  Instagram,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BusinessClaimCard } from '../components/BusinessClaimCard'
import { ReportContentButton } from '../components/ReportContentButton'
import { ReviewsSection } from '../components/ReviewsSection'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { fetchPlaceById } from '../lib/places'
import type { DayKey, Place } from '../types/place'
import { dayLabels, dayOrder, halalLabels, priceLabels } from '../types/place'
import { NotFoundPage } from './NotFoundPage'

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: .65, ease: [.22, 1, .36, 1] },
  },
}

const pageStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: .075, delayChildren: .04 } },
}

function getTodayKey(): DayKey {
  const dayIndex = new Date().getDay()
  return dayOrder[(dayIndex + 6) % 7]
}

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
  const placeholderCount = Math.max(0, 4 - sidePhotos.length)
  const isSaved = isFavorite(place.id)
  const todayKey = getTodayKey()

  return (
    <motion.div
      className="page-width detail-page"
      initial="hidden"
      animate="visible"
      variants={pageStagger}
    >
      <motion.nav className="detail-breadcrumb" aria-label="Jejak navigasi" variants={reveal}>
        <Link className="detail-breadcrumb__link" to="/"><ArrowLeft size={14} /> Jelajah</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span>{place.area}</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>{place.name}</strong>
      </motion.nav>

      <motion.header className="detail-heading" variants={reveal}>
        <div className="detail-heading__copy">
          <div className="detail-heading__eyebrow">
            <span><Sparkles size={12} /> Pilihan lokal</span>
            <span>{place.category}</span>
            <span>{halalLabels[place.halalStatus]}</span>
          </div>
          <h1>{place.name}</h1>
          <p className="detail-heading__tagline">{place.tagline}</p>
          <div className="detail-heading__meta">
            <a className="detail-heading__rating" href="#ulasan-komunitas">
              <Star size={14} fill="currentColor" aria-hidden="true" />
              <strong>{place.rating}</strong>
              <span>{place.reviewCount} ulasan</span>
            </a>
            <span className="detail-heading__area"><MapPin size={14} aria-hidden="true" /> {place.area}, Bandung</span>
            <span className={'detail-heading__status' + (place.isOpen ? ' is-open' : ' is-closed')}>
              <span aria-hidden="true" /> {place.isOpen ? 'Buka sekarang' : 'Sedang tutup'}
            </span>
          </div>
        </div>

        <div className="detail-heading__actions">
          <motion.button
            className={'detail-icon-button' + (isSaved ? ' is-saved' : '')}
            type="button"
            onClick={() => void handleFavoriteToggle()}
            disabled={favoritesLoading}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Hapus dari favorit' : 'Simpan ke favorit'}
            whileHover={{ y: -2 }}
            whileTap={{ scale: .97 }}
          >
            <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
          </motion.button>
          <motion.a
            className="detail-icon-button detail-icon-button--primary"
            href={routeUrl}
            target="_blank"
            rel="noreferrer"
            whileHover={{ y: -2 }}
            whileTap={{ scale: .97 }}
          >
            <Navigation size={16} aria-hidden="true" />
            <span>Buka rute</span>
          </motion.a>
        </div>
      </motion.header>

      {favoriteError && (
        <div className="data-notice data-notice--error detail-action-error" role="alert">
          Favorit gagal disimpan: {favoriteError}
        </div>
      )}

      <motion.section
        className="detail-gallery"
        aria-label={'Galeri foto ' + place.name}
        variants={reveal}
      >
        <div className="detail-gallery__main" style={{ background: 'linear-gradient(135deg, ' + place.accent + ', #282522)' }}>
          {heroPhoto && (
            <>
              <img className="detail-gallery__backdrop" src={heroPhoto.url} alt="" aria-hidden="true" />
              <img className="detail-gallery__image" src={heroPhoto.url} alt={'Foto utama ' + place.name} />
            </>
          )}
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
          {Array.from({ length: placeholderCount }).map((_, index) => (
            <div className="detail-gallery__cell detail-gallery__cell--placeholder" aria-hidden="true" key={'placeholder-' + index}>
              <span>{place.emoji}</span>
            </div>
          ))}
        </div>

        <span className="detail-gallery__badge">
          <Star size={11} fill="currentColor" aria-hidden="true" /> Favorit komunitas
        </span>
        <span className="detail-gallery__counter">
          <Images size={13} aria-hidden="true" /> {photoPool.length > 0 ? `${photoPool.length} foto` : 'Visual tempat'}
        </span>
      </motion.section>

      <motion.section className="detail-summary-strip" aria-label="Ringkasan tempat" variants={reveal}>
        <a className="detail-summary-item" href="#ulasan-komunitas">
          <span className="detail-summary-item__icon"><Star size={18} fill="currentColor" /></span>
          <span>
            <small>Rating komunitas</small>
            <strong>{place.rating} <em>· {place.reviewCount} ulasan</em></strong>
          </span>
        </a>
        <div className="detail-summary-item">
          <span className="detail-summary-item__icon"><CircleDollarSign size={19} /></span>
          <span>
            <small>Kisaran harga</small>
            <strong>{priceLabels[place.priceRange]}</strong>
          </span>
        </div>
        <div className="detail-summary-item">
          <span className="detail-summary-item__icon"><UtensilsCrossed size={18} /></span>
          <span>
            <small>Jenis tempat</small>
            <strong>{place.category}</strong>
          </span>
        </div>
        <div className="detail-summary-item">
          <span className="detail-summary-item__icon"><ShieldCheck size={19} /></span>
          <span>
            <small>Preferensi</small>
            <strong>{halalLabels[place.halalStatus]}</strong>
          </span>
        </div>
      </motion.section>

      <section className="detail-content-grid">
        <main className="detail-main-column">
          <motion.section
            className="detail-card detail-overview-card"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: .2 }}
            variants={reveal}
          >
            <div className="detail-section-heading">
              <span className="detail-section-heading__icon"><Sparkles size={18} /></span>
              <div>
                <span className="section-kicker">MENGAPA LAYAK DICOBA</span>
                <h2>Tentang tempat ini</h2>
              </div>
            </div>
            <p className="detail-description">{place.description}</p>
            <ul className="detail-amenity-list">
              {place.highlights.map((highlight) => (
                <li key={highlight}>
                  <span className="detail-amenity-list__icon"><Check size={15} /></span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: .08 }}
            variants={reveal}
          >
            <ReviewsSection placeId={place.id} onChanged={() => void loadPlace()} />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: .1 }}
            variants={reveal}
          >
            <BusinessClaimCard placeId={place.id} />
          </motion.div>

          <motion.div
            className="detail-report-actions"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={reveal}
          >
            <Flag size={13} aria-hidden="true" />
            <span>Menemukan informasi yang kurang tepat?</span>
            <ReportContentButton entityType="place" entityId={place.id} entityLabel="tempat ini" />
            {heroPhoto && approvedPhotos.length > 0 && (
              <ReportContentButton variant="photo" entityType="place_photo" entityId={heroPhoto.id} entityLabel="foto tempat ini" />
            )}
          </motion.div>
        </main>

        <aside className="detail-side-column">
          <motion.div
            className="detail-sticky-card"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: .2 }}
            variants={reveal}
          >
            <div className="detail-sticky-card__heading">
              <span className="section-kicker">RENCANAKAN KUNJUNGAN</span>
              <div className="detail-sticky-card__price">
                <span>{priceLabels[place.priceRange]}</span>
                <small>per orang</small>
              </div>
            </div>

            <div className="detail-sticky-card__status">
              <span className={'status-pill ' + (place.isOpen ? 'status-pill--open' : 'status-pill--closed')}>
                <span /> {place.isOpen ? 'Buka sekarang' : 'Tutup sekarang'}
              </span>
              <span className="label-pill">{halalLabels[place.halalStatus]}</span>
            </div>

            <motion.a
              className="button button--primary button--full"
              href={routeUrl}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -2 }}
              whileTap={{ scale: .985 }}
            >
              <Navigation size={16} aria-hidden="true" /> Dapatkan rute
            </motion.a>
            <motion.button
              className={'button button--secondary button--full' + (isSaved ? ' is-saved' : '')}
              type="button"
              onClick={() => void handleFavoriteToggle()}
              disabled={favoritesLoading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: .985 }}
            >
              <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
              {isSaved ? 'Tersimpan di favorit' : 'Simpan ke favorit'}
            </motion.button>

            <div className="detail-sticky-card__trust">
              <CheckCircle2 size={15} />
              <span>Informasi dikurasi dan diperbarui bersama komunitas.</span>
            </div>

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
          </motion.div>

          <motion.section
            className="detail-hours-card"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: .2 }}
            variants={reveal}
          >
            <div className="detail-hours-card__heading">
              <span className="detail-hours-card__icon"><Clock3 size={17} aria-hidden="true" /></span>
              <div>
                <span className="section-kicker">WAKTU BERKUNJUNG</span>
                <h2>Jam operasional</h2>
              </div>
            </div>
            <div className="detail-hours-list">
              {dayOrder.map((day) => {
                const hours = place.openingHours[day]
                return (
                  <div className={'detail-hours-list__row' + (day === todayKey ? ' is-today' : '')} key={day}>
                    <span>{dayLabels[day]}{day === todayKey && <small>Hari ini</small>}</span>
                    <strong className={hours.closed ? 'is-closed' : ''}>{hours.closed ? 'Tutup' : hours.open + ' – ' + hours.close}</strong>
                  </div>
                )
              })}
            </div>
          </motion.section>
        </aside>
      </section>
    </motion.div>
  )
}
