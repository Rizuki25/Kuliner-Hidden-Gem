import { ChevronDown, Coffee, Search, SlidersHorizontal, Sparkles, Utensils } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPreview } from '../components/MapPreview'
import { PlaceCard } from '../components/PlaceCard'
import { mockPlaces } from '../data/mockPlaces'
import { fetchPlaces } from '../lib/places'
import type { FoodCategory, HalalStatus, Place, PriceRange } from '../types/place'

type CategoryFilter = 'Semua' | FoodCategory
type HalalFilter = 'Semua' | HalalStatus
type PriceFilter = 'Semua' | PriceRange

export function HomePage() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [places, setPlaces] = useState<Place[]>(mockPlaces)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('Semua')
  const [halal, setHalal] = useState<HalalFilter>('Semua')
  const [price, setPrice] = useState<PriceFilter>('Semua')
  const [selectedPlace, setSelectedPlace] = useState<Place | undefined>(mockPlaces[0])
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<'supabase' | 'mock'>('mock')

  useEffect(() => {
    let isMounted = true

    fetchPlaces().then((result) => {
      if (!isMounted) return
      const nextPlaces = result.places ?? []
      setPlaces(nextPlaces)
      setSelectedPlace(nextPlaces[0])
      setDataSource(result.source)
      setDataError(result.error)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return places.filter((place) => {
      const matchesQuery = !normalizedQuery || [place.name, place.address, place.area, place.category]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      const matchesCategory = category === 'Semua' || place.category === category
      const matchesHalal = halal === 'Semua' || place.halalStatus === halal
      const matchesPrice = price === 'Semua' || place.priceRange === price

      return matchesQuery && matchesCategory && matchesHalal && matchesPrice
    })
  }, [category, halal, places, price, query])

  const activeFilterCount = [category !== 'Semua', halal !== 'Semua', price !== 'Semua'].filter(Boolean).length

  function handleCardSelect(place: Place) {
    setSelectedPlace(place)
    window.setTimeout(() => {
      document.getElementById('peta-kuliner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function resetFilters() {
    setQuery('')
    setCategory('Semua')
    setHalal('Semua')
    setPrice('Semua')
  }

  return (
    <div className="page-width home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow-row"><Sparkles size={15} /> Pilihan lokal Bandung</div>
          <h1>Temukan rasa tersembunyi<br />di sekitar Bandung</h1>
          <p>Warung kecil, kedai rumahan, dan rasa lokal yang layak kamu temukan.</p>
        </div>

        <div className="hero-aside" aria-label={`${places.length} tempat lokal`}>
          <span className="hero-aside__number">{places.length.toString().padStart(2, '0')}</span>
          <span className="hero-aside__label">tempat lokal<br />untuk dijelajahi</span>
        </div>
      </section>

      <section className="search-box" aria-label="Cari kuliner">
        <div className="search-box__main">
          <span className="search-box__label">Mau makan apa?</span>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari tempat, menu, atau area"
            aria-label="Cari nama tempat, makanan, atau area"
          />
        </div>

        <label className="search-box__segment">
          <span className="search-box__label">Kisaran harga</span>
          <select value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}>
            <option value="Semua">Semua harga</option>
            <option value="murah">Di bawah 25K</option>
            <option value="sedang">25K–60K</option>
            <option value="mahal">Di atas 60K</option>
          </select>
          <ChevronDown size={15} />
        </label>

        <label className="search-box__segment">
          <span className="search-box__label">Preferensi</span>
          <select value={halal} onChange={(event) => setHalal(event.target.value as HalalFilter)}>
            <option value="Semua">Semua label</option>
            <option value="halal">Halal</option>
            <option value="non-halal">Non-halal</option>
          </select>
          <ChevronDown size={15} />
        </label>

        <button className="search-orb" type="button" aria-label="Mulai pencarian" onClick={() => searchInputRef.current?.focus()}>
          <Search size={19} strokeWidth={2.5} />
        </button>
      </section>

      <section className="filter-section" aria-label="Filter kategori kuliner">
        <div className="filter-section__label"><SlidersHorizontal size={16} /> Jelajahi</div>
        <div className="filter-group">
          {(['Semua', 'Makanan', 'Minuman'] as CategoryFilter[]).map((item) => (
            <button
              className={`filter-chip${category === item ? ' is-active' : ''}`}
              key={item}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item === 'Semua' ? <Sparkles size={15} /> : item === 'Makanan' ? <Utensils size={15} /> : <Coffee size={15} />}
              {item}
            </button>
          ))}
        </div>
        {activeFilterCount > 0 && (
          <button className="clear-filter" type="button" onClick={resetFilters}>
            Reset filter ({activeFilterCount})
          </button>
        )}
      </section>

      {dataError && (
        <div className="data-notice data-notice--error" role="status">
          Supabase belum bisa dimuat. Aplikasi menampilkan data demo sementara. Detail teknis: {dataError}
        </div>
      )}

      {dataSource === 'supabase' && !dataError && (
        <div className="data-notice" role="status">Data tersambung dari Supabase · Kota Bandung</div>
      )}

      <section className="explore-grid">
        <div className="results-panel" id="hasil-kuliner">
          <div className="results-panel__header">
            <div>
              <span className="section-kicker">Pilihan untukmu</span>
              <h2>Kuliner tersembunyi di Bandung</h2>
            </div>
            <span className="result-count">{filteredPlaces.length} tempat ditemukan</span>
          </div>

          {isLoading ? (
            <div className="loading-state"><span className="loading-dot" /> Memuat kuliner Bandung...</div>
          ) : filteredPlaces.length > 0 ? (
            <div className="place-list">
              {filteredPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} marketplace onSelect={handleCardSelect} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state__icon">⌕</span>
              <h3>Belum ada yang cocok</h3>
              <p>Coba ganti kata kunci atau kurangi filter pencarianmu.</p>
              <button className="button button--secondary" type="button" onClick={resetFilters}>Tampilkan semua</button>
            </div>
          )}
        </div>

        <MapPreview places={filteredPlaces} selectedPlaceId={selectedPlace?.id} onSelect={setSelectedPlace} />
      </section>

      <section className="contribute-banner">
        <div>
          <span className="section-kicker">Kenal tempat tersembunyi?</span>
          <h2>Bantu kami menemukan rasa berikutnya.</h2>
          <p>Bantu orang lain menemukan tempat lokal yang layak dicoba.</p>
        </div>
        <Link className="button button--light" to="/usulkan-tempat">Usulkan tempat <span>↗</span></Link>
      </section>
    </div>
  )
}
