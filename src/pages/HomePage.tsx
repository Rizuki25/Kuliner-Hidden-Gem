import { ChevronDown, Coffee, MapPin, Search, SlidersHorizontal, Sparkles, Utensils } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPreview } from '../components/MapPreview'
import { PlaceCard } from '../components/PlaceCard'
import { mockPlaces } from '../data/mockPlaces'
import { fetchPlaces, summarizePlaces, type PlaceStats } from '../lib/places'
import type { FoodCategory, HalalStatus, Place, PriceRange } from '../types/place'

type CategoryFilter = 'Semua' | FoodCategory
type HalalFilter = 'Semua' | HalalStatus
type PriceFilter = 'Semua' | PriceRange

const citySpots = [
  { name: 'Dago', category: 'Kafe & Resto', count: 24, emoji: '🍜' },
  { name: 'Braga', category: 'Jajanan Legendaris', count: 18, emoji: '🥮' },
  { name: 'Cihapit', category: 'Warung Rumahan', count: 15, emoji: '🍲' },
  { name: 'Buah Batu', category: 'Kuliner Malam', count: 12, emoji: '🌙' },
  { name: 'Setiabudhi', category: 'Fine Dining Lokal', count: 9, emoji: '🍷' },
  { name: 'Antapani', category: 'Kopi & Roti', count: 14, emoji: '☕' },
]

const marqueeItems = ['Sate', 'Batagor', 'Siomay', 'Bakso', 'Nasi Timbel', 'Kopi', 'Es Cendol', 'Pisang Goreng', 'Mie Kocok', 'Cireng', 'Seblak', 'Surabi']

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
  const [stats, setStats] = useState<PlaceStats>(() => summarizePlaces(mockPlaces))
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({})
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    let isMounted = true

    fetchPlaces().then((result) => {
      if (!isMounted) return
      const nextPlaces = result.places ?? []
      setPlaces(nextPlaces)
      setSelectedPlace(nextPlaces[0])
      setStats(summarizePlaces(nextPlaces))
      setDataSource(result.source)
      setDataError(result.error)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [places])

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

    // The map is already visible beside the cards on larger screens. Only
    // move to it on smaller screens where it appears below the result list.
    if (window.matchMedia('(max-width: 900px)').matches) {
      window.setTimeout(() => {
        document.getElementById('peta-kuliner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }
  }

  function resetFilters() {
    setQuery('')
    setCategory('Semua')
    setHalal('Semua')
    setPrice('Semua')
  }

  const setSectionRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }

  const isVisible = (id: string) => visibleSections[id] ? 'is-visible' : ''

  return (
    <div className="page-width home-page">
      {/* Animated background blobs */}
      <div className="hero-blobs" aria-hidden="true">
        <div className="hero-blob hero-blob--1" />
        <div className="hero-blob hero-blob--2" />
        <div className="hero-blob hero-blob--3" />
      </div>

      <section className="hero-section hero-section--animated" id="hero" ref={setSectionRef('hero')}>
        <div className="hero-copy">
          <div className="eyebrow-row animate-fade-in-up">
            <Sparkles size={15} className="sparkle-icon" /> Pilihan lokal Bandung
          </div>
          <h1 className="animate-fade-in-up animate-delay-1">
            Temukan rasa <em>tersembunyi</em><br />di sekitar Bandung
          </h1>
          <p className="animate-fade-in-up animate-delay-2">Warung kecil, kedai rumahan, dan rasa lokal yang layak kamu temukan. Setiap sudut kota punya cerita rasa.</p>
          
          <div className="hero-stats animate-fade-in-up animate-delay-3">
            <div className="hero-stat">
              <span className="hero-stat__number">{stats.placeCount}</span>
              <span className="hero-stat__label">Tempat</span>
            </div>
            <div className="hero-stat__divider" />
            <div className="hero-stat">
              <span className="hero-stat__number">{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}</span>
              <span className="hero-stat__label">Rating</span>
            </div>
            <div className="hero-stat__divider" />
            <div className="hero-stat">
              <span className="hero-stat__number">{stats.reviewCount}</span>
              <span className="hero-stat__label">Ulasan</span>
            </div>
          </div>
        </div>

        <div className="hero-visual animate-fade-in-up animate-delay-2" aria-hidden="true">
          <div className="hero-visual__card hero-visual__card--1">
            <span className="hero-visual__emoji">🍜</span>
            <div className="hero-visual__info">
              <strong>Mie Kocok</strong>
              <span>Dago</span>
            </div>
          </div>
          <div className="hero-visual__card hero-visual__card--2">
            <span className="hero-visual__emoji">☕</span>
            <div className="hero-visual__info">
              <strong>Kopi Susu</strong>
              <span>Braga</span>
            </div>
          </div>
          <div className="hero-visual__card hero-visual__card--3">
            <span className="hero-visual__emoji">🥘</span>
            <div className="hero-visual__info">
              <strong>Nasi Timbel</strong>
              <span>Cihapit</span>
            </div>
          </div>
          <div className="hero-visual__ring hero-visual__ring--1" />
          <div className="hero-visual__ring hero-visual__ring--2" />
        </div>
      </section>

      {/* Marquee banner */}
      <div className="marquee-banner" aria-hidden="true">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span className="marquee-item" key={index}>
              <span className="marquee-dot" /> {item}
            </span>
          ))}
        </div>
      </div>

      <section className="search-box search-box--elevated animate-scale-in" aria-label="Cari kuliner">
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

        <button className="search-orb search-orb--pulse" type="button" aria-label="Mulai pencarian" onClick={() => searchInputRef.current?.focus()}>
          <Search size={19} strokeWidth={2.5} />
        </button>
      </section>

      <section className="filter-section animate-fade-in-up" aria-label="Filter kategori kuliner" id="filters" ref={setSectionRef('filters')}>
        <div className="filter-section__label"><SlidersHorizontal size={16} /> Jelajahi</div>
        <div className="filter-group">
          {(['Semua', 'Makanan', 'Minuman'] as CategoryFilter[]).map((item) => (
            <button
              className={`filter-chip filter-chip--animated${category === item ? ' is-active' : ''}`}
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

      {/* City exploration grid */}
      <section className={`city-grid-section ${isVisible('cities')}`} id="cities" ref={setSectionRef('cities')}>
        <div className="section-header">
          <span className="section-kicker">Inspirasi untuk jelajah</span>
          <h2>Area populer di Bandung</h2>
        </div>
        <div className="city-grid">
          {citySpots.map((city, index) => (
            <button
              className={`city-card ${isVisible('cities')}`}
              style={{ transitionDelay: `${index * 60}ms` }}
              key={city.name}
              type="button"
              onClick={() => setQuery(city.name)}
            >
              <span className="city-card__emoji">{city.emoji}</span>
              <div className="city-card__content">
                <strong>{city.name}</strong>
                <span>{city.category}</span>
              </div>
              <span className="city-card__count">{city.count} tempat</span>
              <span className="city-card__arrow"><MapPin size={14} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="explore-grid" id="results" ref={setSectionRef('results')}>
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
              {filteredPlaces.map((place, index) => (
                <div
                  className={`place-card-wrapper ${isVisible('results')}`}
                  style={{ transitionDelay: `${index * 80}ms` }}
                  key={place.id}
                >
                  <PlaceCard place={place} marketplace onSelect={handleCardSelect} />
                </div>
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

      <section className={`contribute-banner contribute-banner--animated ${isVisible('contribute')}`} id="contribute" ref={setSectionRef('contribute')}>
        <div className="contribute-banner__glow" aria-hidden="true" />
        <div>
          <span className="section-kicker">Kenal tempat tersembunyi?</span>
          <h2>Bantu kami menemukan rasa berikutnya.</h2>
          <p>Bantu orang lain menemukan tempat lokal yang layak dicoba. Setiap rekomendasi berarti.</p>
        </div>
        <Link className="button button--light button--glow" to="/usulkan-tempat">
          Usulkan tempat <span>↗</span>
        </Link>
      </section>
    </div>
  )
}
