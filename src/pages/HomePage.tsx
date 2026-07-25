import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  Coffee,
  Compass,
  Map,
  MapPin,
  Search,
  SearchX,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MapPreview } from '../components/MapPreview'
import { PlaceCard } from '../components/PlaceCard'
import { mockPlaces } from '../data/mockPlaces'
import { fetchPlaces, summarizePlaces, type PlaceStats } from '../lib/places'
import { priceLabels, type FoodCategory, type HalalStatus, type Place, type PriceRange } from '../types/place'

type CategoryFilter = 'Semua' | FoodCategory
type HalalFilter = 'Semua' | HalalStatus
type PriceFilter = 'Semua' | PriceRange

const citySpots = [
  { name: 'Dago', category: 'Kafe & resto', count: 24 },
  { name: 'Braga', category: 'Jajanan legendaris', count: 18 },
  { name: 'Cihapit', category: 'Warung rumahan', count: 15 },
  { name: 'Buah Batu', category: 'Kuliner malam', count: 12 },
  { name: 'Setiabudhi', category: 'Rasa lokal modern', count: 9 },
  { name: 'Antapani', category: 'Kopi & roti', count: 14 },
]

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: .68, ease: [.22, 1, .36, 1] },
  },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: .065, delayChildren: .06 } },
}

const itemReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: .5, ease: [.22, 1, .36, 1] },
  },
}

const numberFormatter = new Intl.NumberFormat('id-ID')

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

  const activeFilterCount = [
    category !== 'Semua',
    halal !== 'Semua',
    price !== 'Semua',
    query.trim().length > 0,
  ].filter(Boolean).length

  const featuredPlace = places[0] ?? mockPlaces[0]
  const featuredImage = featuredPlace.photoUrls?.[0]

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleCardSelect(place: Place) {
    setSelectedPlace(place)

    if (window.matchMedia('(max-width: 1024px)').matches) {
      window.setTimeout(() => scrollToSection('peta-kuliner'), 0)
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    searchInputRef.current?.blur()
    scrollToSection('hasil-kuliner')
  }

  function handleAreaSelect(area: string) {
    setQuery(area)
    window.setTimeout(() => scrollToSection('hasil-kuliner'), 0)
  }

  function resetFilters() {
    setQuery('')
    setCategory('Semua')
    setHalal('Semua')
    setPrice('Semua')
  }

  return (
    <div className="page-width home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <motion.div
          className="home-hero__content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div className="home-hero__eyebrow" variants={itemReveal}>
            <span className="home-hero__signal"><Sparkles size={13} /></span>
            Kurasi warga Bandung
          </motion.div>

          <motion.h1 id="home-hero-title" variants={itemReveal}>
            Rasa terbaik sering <span>bersembunyi.</span>
          </motion.h1>

          <motion.p variants={itemReveal}>
            Temukan warung kecil, kedai rumahan, dan cerita rasa lokal yang tidak selalu muncul di halaman pertama.
          </motion.p>

          <motion.div className="home-hero__actions" variants={itemReveal}>
            <motion.button
              className="home-button home-button--primary"
              type="button"
              onClick={() => scrollToSection('pencarian-kuliner')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: .98 }}
            >
              <Compass size={17} />
              Mulai jelajah
              <ArrowDown size={15} />
            </motion.button>
            <motion.button
              className="home-button home-button--ghost"
              type="button"
              onClick={() => scrollToSection('peta-kuliner')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: .98 }}
            >
              <Map size={17} />
              Buka peta
            </motion.button>
          </motion.div>

          <motion.dl className="home-hero__stats" variants={itemReveal} aria-label="Ringkasan komunitas">
            <div>
              <dt>Tempat terkurasi</dt>
              <dd>{numberFormatter.format(stats.placeCount)}</dd>
            </div>
            <div>
              <dt>Rata-rata rating</dt>
              <dd>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}</dd>
            </div>
            <div>
              <dt>Cerita pengunjung</dt>
              <dd>{numberFormatter.format(stats.reviewCount)}</dd>
            </div>
          </motion.dl>
        </motion.div>

        <motion.aside
          className={`home-feature${featuredImage ? ' home-feature--photo' : ''}`}
          initial={{ opacity: 0, scale: .96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: .8, delay: .18, ease: [.22, 1, .36, 1] }}
          aria-label={`Pilihan utama: ${featuredPlace.name}`}
        >
          {featuredImage && <img src={featuredImage} alt="" aria-hidden="true" />}
          <div className="home-feature__wash" aria-hidden="true" />
          <div className="home-feature__grid" aria-hidden="true" />

          {!featuredImage && (
            <motion.div
              className="home-feature__plate"
              style={{ x: '-50%' }}
              animate={{ y: [0, -7, 0], rotate: [0, 1.5, 0] }}
              transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              <span>{featuredPlace.emoji}</span>
            </motion.div>
          )}

          <div className="home-feature__topline">
            <span><Sparkles size={13} /> Pilihan minggu ini</span>
            <span>{featuredPlace.area}</span>
          </div>

          <div className="home-feature__content">
            <div className="home-feature__meta">
              <span>{featuredPlace.category}</span>
              <span>{priceLabels[featuredPlace.priceRange]}</span>
              <span>★ {featuredPlace.rating}</span>
            </div>
            <h2>{featuredPlace.name}</h2>
            <p>{featuredPlace.tagline}</p>
            <Link className="home-feature__link" to={`/tempat/${featuredPlace.id}`}>
              Lihat cerita tempat ini <ArrowUpRight size={16} />
            </Link>
          </div>
        </motion.aside>
      </section>

      <motion.section
        className="discovery-panel"
        id="pencarian-kuliner"
        aria-label="Cari dan saring kuliner"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: .35 }}
        variants={reveal}
      >
        <form className="discovery-search" onSubmit={handleSearchSubmit}>
          <label className="discovery-search__main">
            <span className="discovery-search__icon" aria-hidden="true"><Search size={18} /></span>
            <span className="discovery-search__copy">
              <span className="discovery-search__label">Cari rasa atau tempat</span>
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Mie kocok, Braga, kopi..."
                aria-label="Cari nama tempat, makanan, atau area"
              />
            </span>
          </label>

          <label className="discovery-search__segment">
            <span className="discovery-search__label">Kisaran harga</span>
            <select value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}>
              <option value="Semua">Semua harga</option>
              <option value="murah">Di bawah 25K</option>
              <option value="sedang">25K–60K</option>
              <option value="mahal">Di atas 60K</option>
            </select>
            <ChevronDown size={15} />
          </label>

          <label className="discovery-search__segment">
            <span className="discovery-search__label">Preferensi</span>
            <select value={halal} onChange={(event) => setHalal(event.target.value as HalalFilter)}>
              <option value="Semua">Semua label</option>
              <option value="halal">Halal</option>
              <option value="non-halal">Non-halal</option>
            </select>
            <ChevronDown size={15} />
          </label>

          <motion.button
            className="discovery-search__submit"
            type="submit"
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: .97 }}
          >
            <Search size={17} />
            <span>Cari</span>
          </motion.button>
        </form>

        <div className="discovery-filters">
          <span className="discovery-filters__label">Kategori</span>
          <div className="discovery-filters__group">
            {(['Semua', 'Makanan', 'Minuman'] as CategoryFilter[]).map((item) => (
              <motion.button
                className={`discovery-chip${category === item ? ' is-active' : ''}`}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                whileTap={{ scale: .97 }}
              >
                {category === item && (
                  <motion.span className="discovery-chip__active" layoutId="active-category" />
                )}
                <span className="discovery-chip__content">
                  {item === 'Semua' ? <Sparkles size={14} /> : item === 'Makanan' ? <Utensils size={14} /> : <Coffee size={14} />}
                  {item}
                </span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.button
                className="discovery-filters__reset"
                type="button"
                onClick={resetFilters}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                Reset {activeFilterCount} filter
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {dataError && (
        <div className="home-data-notice home-data-notice--warning" role="status">
          <span className="home-data-notice__icon">!</span>
          <span><strong>Mode pratinjau aktif.</strong> Data demo ditampilkan sementara.</span>
          <details>
            <summary>Detail</summary>
            <span>{dataError}</span>
          </details>
        </div>
      )}

      {dataSource === 'supabase' && !dataError && (
        <div className="home-data-notice" role="status">
          <span className="home-data-notice__icon"><Check size={13} /></span>
          Data komunitas Bandung tersambung
        </div>
      )}

      <motion.section
        className="home-section neighborhood-section"
        aria-labelledby="neighborhood-heading"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: .18 }}
        variants={reveal}
      >
        <header className="home-section__header">
          <div>
            <span className="home-section__kicker">Mulai dari lingkungan</span>
            <h2 id="neighborhood-heading">Sudut Bandung yang layak disusuri</h2>
          </div>
          <button className="home-section__link" type="button" onClick={() => scrollToSection('hasil-kuliner')}>
            Lihat semua tempat <ArrowDown size={15} />
          </button>
        </header>

        <motion.div className="neighborhood-row" variants={stagger}>
          {citySpots.map((city, index) => (
            <motion.button
              className="neighborhood-card"
              key={city.name}
              type="button"
              onClick={() => handleAreaSelect(city.name)}
              variants={itemReveal}
              whileHover={{ y: -5 }}
              whileTap={{ scale: .985 }}
            >
              <span className="neighborhood-card__number">{String(index + 1).padStart(2, '0')}</span>
              <span className="neighborhood-card__copy">
                <strong>{city.name}</strong>
                <span>{city.category}</span>
              </span>
              <span className="neighborhood-card__footer">
                {city.count} tempat
                <span className="neighborhood-card__arrow"><ArrowUpRight size={15} /></span>
              </span>
            </motion.button>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="home-section results-section"
        id="hasil-kuliner"
        aria-labelledby="results-heading"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: .08 }}
        variants={reveal}
      >
        <header className="home-section__header home-section__header--results">
          <div>
            <span className="home-section__kicker">Dikurasi untukmu</span>
            <h2 id="results-heading">Temuan rasa di Bandung</h2>
            <p>Tempat kecil dengan rasa, suasana, dan cerita yang pantas mendapat sorotan.</p>
          </div>
          <span className="home-result-count">{filteredPlaces.length} tempat ditemukan</span>
        </header>

        <div className="explore-grid">
          <div className="results-panel">
            {isLoading ? (
              <div className="place-list home-skeleton-list" aria-label="Memuat kuliner Bandung" aria-busy="true">
                {[0, 1, 2, 3].map((item) => (
                  <div className="home-card-skeleton" key={item}>
                    <span />
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            ) : filteredPlaces.length > 0 ? (
              <motion.div className="place-list" layout variants={stagger}>
                <AnimatePresence mode="popLayout">
                  {filteredPlaces.map((place) => (
                    <motion.div
                      className="place-card-wrapper"
                      layout
                      variants={itemReveal}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: .96, transition: { duration: .18 } }}
                      key={place.id}
                    >
                      <PlaceCard place={place} marketplace onSelect={handleCardSelect} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0, scale: .97 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span className="empty-state__icon"><SearchX size={26} /></span>
                <h3>Belum ada yang cocok</h3>
                <p>Coba kata kunci lain atau longgarkan preferensi pencarianmu.</p>
                <button className="home-button home-button--ghost" type="button" onClick={resetFilters}>
                  Tampilkan semua
                </button>
              </motion.div>
            )}
          </div>

          <motion.div className="home-map-column" variants={itemReveal}>
            <MapPreview places={filteredPlaces} selectedPlaceId={selectedPlace?.id} onSelect={setSelectedPlace} />
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="home-contribute"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: .35 }}
        variants={reveal}
      >
        <div className="home-contribute__mark" aria-hidden="true">
          <MapPin size={24} />
        </div>
        <div className="home-contribute__copy">
          <span>Ikut membangun peta rasa</span>
          <h2>Tempat kecil favoritmu bisa jadi temuan besar berikutnya.</h2>
          <p>Bagikan rekomendasi lokal dan bantu lebih banyak orang menemukan rasa yang pantas dicoba.</p>
        </div>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: .98 }}>
          <Link className="home-button home-button--light" to="/usulkan-tempat">
            Usulkan tempat <ArrowUpRight size={16} />
          </Link>
        </motion.div>
      </motion.section>
    </div>
  )
}
