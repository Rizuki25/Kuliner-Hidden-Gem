import { ArrowLeft, Heart, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard'
import { useAuth } from '../context/AuthContext'
import { fetchFavoritePlaces } from '../lib/places'
import type { Place } from '../types/place'

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

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
      <div className="favorites-page__heading">
        <div className="centered-page__icon"><Heart size={24} /></div>
        <div>
          <span className="section-kicker">Koleksi pribadi</span>
          <h1>Tempat yang ingin kamu coba</h1>
          <p>Semua temuan favorit tersimpan di satu tempat.</p>
        </div>
        <span className="favorites-page__count">{places.length} tersimpan</span>
      </div>

      {isLoading ? (
        <div className="loading-state"><LoaderCircle size={17} className="spin" /> Memuat favorit...</div>
      ) : error ? (
        <div className="data-notice data-notice--error" role="alert">Favorit gagal dimuat: {error}</div>
      ) : places.length === 0 ? (
        <div className="empty-state favorites-empty">
          <span className="empty-state__icon">♡</span>
          <h3>Belum ada tempat tersimpan</h3>
          <p>Simpan tempat dari halaman detail agar mudah ditemukan lagi.</p>
          <Link className="button button--secondary" to="/">Mulai menjelajah</Link>
        </div>
      ) : (
        <div className="favorites-list">
          {places.map((place) => <PlaceCard key={place.id} place={place} marketplace />)}
        </div>
      )}
    </div>
  )
}
