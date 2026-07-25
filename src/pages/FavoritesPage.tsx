import { ArrowLeft, Heart, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FavoritePlaceCard } from '../components/FavoritePlaceCard'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { fetchFavoritePlaces } from '../lib/places'
import type { Place } from '../types/place'

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: .07, delayChildren: .08 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: .985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: .52, ease: [.22, 1, .36, 1] },
  },
}

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { loading: favoritesLoading, toggleFavorite } = useFavorites()
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const [removingId, setRemovingId] = useState<string>()

  useEffect(() => {
    let isMounted = true

    if (!user) {
      setPlaces([])
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    setIsLoading(true)
    fetchFavoritePlaces(user.id).then((result) => {
      if (!isMounted) return
      setPlaces(result.places ?? [])
      setError(result.error)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [user?.id])

  async function handleRemove(placeId: string) {
    if (favoritesLoading || removingId) return

    setActionError(undefined)
    setRemovingId(placeId)
    const result = await toggleFavorite(placeId)

    if (result.error) {
      setActionError(`Favorit gagal diperbarui: ${result.error}`)
    } else if (result.requiresLogin) {
      setActionError('Sesi kamu telah berakhir. Silakan masuk kembali.')
    } else if (result.isFavorite === false) {
      setPlaces((current) => current.filter((place) => place.id !== placeId))
    } else {
      setActionError('Status favorit belum dapat diperbarui. Silakan coba lagi.')
    }

    setRemovingId(undefined)
  }

  if (authLoading) {
    return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memuat akun...</div>
  }

  if (!user) {
    return (
      <div className="page-width centered-page favorites-gate">
        <div className="centered-page__icon"><Heart size={24} /></div>
        <span className="section-kicker">Favoritmu</span>
        <h1>Simpan tempat yang ingin dicoba</h1>
        <p>Masuk untuk menyimpan kuliner favoritmu dan menemukannya lagi kapan saja.</p>
        <div className="centered-page__actions">
          <Link className="button button--primary" to="/login?next=%2Ffavorit"><LockKeyhole size={16} /> Masuk untuk melihat favorit</Link>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali menjelajah</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-width favorites-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link>
      <motion.div
        className="favorites-page__heading"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .6, ease: [.22, 1, .36, 1] }}
      >
        <div className="centered-page__icon"><Heart size={24} /></div>
        <div>
          <span className="section-kicker"><Sparkles size={12} /> Koleksi pribadi</span>
          <h1>Tempat yang ingin kamu coba</h1>
          <p>Semua temuan favorit tersimpan di satu tempat.</p>
        </div>
        <span className="favorites-page__count">{places.length} tersimpan</span>
      </motion.div>

      {isLoading ? (
        <div className="favorites-list favorites-skeleton-list" aria-label="Memuat favorit" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div className="favorite-card-skeleton" key={item}>
              <span />
              <i />
              <i />
              <i />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="data-notice data-notice--error" role="alert">Favorit gagal dimuat: {error}</div>
      ) : places.length === 0 ? (
        <motion.div
          className="empty-state favorites-empty"
          initial={{ opacity: 0, scale: .97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: .45 }}
        >
          <span className="empty-state__icon">♡</span>
          <h3>Belum ada tempat tersimpan</h3>
          <p>Simpan tempat dari halaman detail agar mudah ditemukan lagi.</p>
          <Link className="button button--secondary" to="/">Mulai menjelajah</Link>
        </motion.div>
      ) : (
        <>
          {actionError && <div className="data-notice data-notice--error favorites-action-error" role="alert">{actionError}</div>}
          <motion.div
            className="favorites-list"
            variants={listVariants}
            initial="hidden"
            animate="visible"
            layout
          >
            <AnimatePresence mode="popLayout">
              {places.map((place) => (
                <motion.div
                  className="favorite-card-wrap"
                  key={place.id}
                  layout
                  variants={cardVariants}
                  exit={{ opacity: 0, scale: .94, transition: { duration: .2 } }}
                >
                  <FavoritePlaceCard
                    place={place}
                    isRemoving={removingId === place.id || favoritesLoading}
                    onRemove={(placeId) => void handleRemove(placeId)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  )
}
