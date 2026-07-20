import { mockPlaces } from '../data/mockPlaces'
import type { DayKey, HalalStatus, OpeningHour, Place, PlacePhoto, PriceRange } from '../types/place'
import { SUBMISSION_PHOTO_BUCKET } from './submissions'
import { supabase } from './supabase'

type SupabasePlaceHourRow = {
  day_of_week: number
  is_closed: boolean
  is_24_hours: boolean
  open_time: string | null
  close_time: string | null
}

type SupabasePlacePhotoRow = {
  id: string
  storage_path: string
  caption: string | null
  sort_order: number
  is_cover: boolean
  publication_status: 'approved' | 'pending' | 'rejected' | 'archived'
}

type SupabasePlaceRow = {
  id: string
  slug: string
  name: string
  category: 'makanan' | 'minuman'
  price_range: 'murah' | 'sedang' | 'mahal' | 'tidak_diketahui'
  halal_status: 'halal' | 'non_halal' | 'belum_terverifikasi'
  description: string | null
  phone: string | null
  website_url: string | null
  instagram_url: string | null
  address: string
  area: string | null
  latitude: number
  longitude: number
  rating: number
  review_count: number
  place_hours: SupabasePlaceHourRow[] | null
  place_photos: SupabasePlacePhotoRow[] | null
}

export type PlaceLoadResult = {
  place?: Place
  places?: Place[]
  source: 'supabase' | 'mock'
  error?: string
}

export type PlaceStats = {
  placeCount: number
  averageRating: number
  reviewCount: number
}

/**
 * Summarizes the approved places returned by the public directory query.
 * Ratings are weighted by each place's approved review count so the result
 * represents the average of all approved reviews, rather than an average of
 * place averages.
 */
export function summarizePlaces(places: Place[]): PlaceStats {
  const reviewCount = places.reduce((total, place) => total + place.reviewCount, 0)
  const ratingPoints = places.reduce(
    (total, place) => total + place.rating * place.reviewCount,
    0,
  )

  return {
    placeCount: places.length,
    averageRating: reviewCount > 0 ? Number((ratingPoints / reviewCount).toFixed(1)) : 0,
    reviewCount,
  }
}

const dayKeys: DayKey[] = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']

const defaultHours = (): Record<DayKey, OpeningHour> => ({
  senin: { closed: true },
  selasa: { closed: true },
  rabu: { closed: true },
  kamis: { closed: true },
  jumat: { closed: true },
  sabtu: { closed: true },
  minggu: { closed: true },
})

function toPriceRange(value: SupabasePlaceRow['price_range']): PriceRange {
  return value === 'tidak_diketahui' ? 'tidak-diketahui' : value
}

function toHalalStatus(value: SupabasePlaceRow['halal_status']): HalalStatus {
  if (value === 'non_halal') return 'non-halal'
  if (value === 'belum_terverifikasi') return 'belum-terverifikasi'
  return 'halal'
}

function toOpeningHours(rows: SupabasePlaceHourRow[] | null): Record<DayKey, OpeningHour> {
  const hours = defaultHours()

  for (const row of rows ?? []) {
    const day = dayKeys[row.day_of_week]
    if (!day) continue

    hours[day] = {
      closed: row.is_closed,
      open: row.open_time?.slice(0, 5),
      close: row.close_time?.slice(0, 5),
    }

    if (row.is_24_hours) {
      hours[day] = { open: '00:00', close: '24:00' }
    }
  }

  return hours
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function isOpenNow(hours: Record<DayKey, OpeningHour>): boolean {
  const now = new Date()
  const today = dayKeys[now.getDay()]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const todayHours = hours[today]

  if (!todayHours || todayHours.closed) return false
  if (todayHours.open === '00:00' && todayHours.close === '24:00') return true
  if (!todayHours.open || !todayHours.close) return false

  const opening = timeToMinutes(todayHours.open)
  const closing = todayHours.close === '24:00' ? 1440 : timeToMinutes(todayHours.close)

  if (closing < opening) {
    return currentMinutes >= opening || currentMinutes <= closing
  }

  return currentMinutes >= opening && currentMinutes <= closing
}

function getAccent(category: SupabasePlaceRow['category']): string {
  return category === 'makanan' ? '#e5814f' : '#b68a66'
}

function getEmoji(category: SupabasePlaceRow['category']): string {
  return category === 'makanan' ? '🍛' : '☕'
}

function getTagline(description: string | null): string {
  if (!description) return 'Temukan rasa lokal Bandung yang belum banyak orang tahu.'
  const firstSentence = description.split('. ')[0]
  return firstSentence.length > 72 ? `${firstSentence.slice(0, 69)}…` : firstSentence
}

function getApprovedPhotoRows(row: SupabasePlaceRow) {
  return (row.place_photos ?? [])
    .filter((photo) => photo.publication_status === 'approved')
    .sort((left, right) => Number(right.is_cover) - Number(left.is_cover) || left.sort_order - right.sort_order)
}

async function mapSupabasePlaceWithPhotos(row: SupabasePlaceRow): Promise<Place> {
  const place = mapSupabasePlace(row)
  const client = supabase
  if (!client) return place

  const photoRecords = await Promise.all(getApprovedPhotoRows(row).map(async (photo): Promise<PlacePhoto> => {
    const { data } = await client.storage
      .from(SUBMISSION_PHOTO_BUCKET)
      .createSignedUrl(photo.storage_path, 60 * 60)

    return {
      id: photo.id,
      storagePath: photo.storage_path,
      caption: photo.caption,
      sortOrder: photo.sort_order,
      isCover: photo.is_cover,
      publicationStatus: photo.publication_status,
      url: data?.signedUrl,
    }
  }))

  const usablePhotoUrls = photoRecords.flatMap((photo) => photo.url ? [photo.url] : [])
  return photoRecords.length > 0 ? { ...place, photoUrls: usablePhotoUrls, photoRecords } : place
}

export function mapSupabasePlace(row: SupabasePlaceRow): Place {
  const openingHours = toOpeningHours(row.place_hours)

  return {
    id: row.id,
    name: row.name,
    tagline: getTagline(row.description),
    category: row.category === 'makanan' ? 'Makanan' : 'Minuman',
    priceRange: toPriceRange(row.price_range),
    halalStatus: toHalalStatus(row.halal_status),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    address: row.address,
    area: row.area ?? 'Bandung',
    accent: getAccent(row.category),
    emoji: getEmoji(row.category),
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    isOpen: isOpenNow(openingHours),
    description: row.description ?? getTagline(row.description),
    phone: row.phone ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    highlights: [],
    openingHours,
  }
}

const placeSelect = `
  id,
  slug,
  name,
  category,
  price_range,
  halal_status,
  description,
  phone,
  website_url,
  instagram_url,
  address,
  area,
  latitude,
  longitude,
  rating,
  review_count,
  place_hours (
    day_of_week,
    is_closed,
    is_24_hours,
    open_time,
    close_time
  ),
  place_photos (
    id,
    storage_path,
    caption,
    sort_order,
    is_cover,
    publication_status
  )
`

export async function fetchPlaces(): Promise<PlaceLoadResult> {
  if (!supabase) {
    return { places: mockPlaces, source: 'mock' }
  }

  const { data, error } = await supabase
    .from('places')
    .select(placeSelect)
    .eq('publication_status', 'approved')
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    return { places: mockPlaces, source: 'mock', error: error.message }
  }

  return {
    places: await Promise.all((data as unknown as SupabasePlaceRow[]).map(mapSupabasePlaceWithPhotos)),
    source: 'supabase',
  }
}

export async function fetchPlaceById(placeId: string): Promise<PlaceLoadResult> {
  if (!supabase) {
    return { place: mockPlaces.find((item) => item.id === placeId), source: 'mock' }
  }

  const { data, error } = await supabase
    .from('places')
    .select(placeSelect)
    .eq('id', placeId)
    .eq('publication_status', 'approved')
    .maybeSingle()

  if (error) {
    return { source: 'supabase', error: error.message }
  }

  return {
    place: data ? await mapSupabasePlaceWithPhotos(data as unknown as SupabasePlaceRow) : undefined,
    source: 'supabase',
  }
}

export async function fetchFavoritePlaces(userId: string): Promise<PlaceLoadResult> {
  if (!supabase) {
    return { places: [], source: 'mock' }
  }

  const { data, error } = await supabase
    .from('favorites')
    .select(`created_at, places (${placeSelect})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { places: [], source: 'supabase', error: error.message }
  }

  const rows = data as unknown as Array<{ places: SupabasePlaceRow | null }>
  return {
    places: await Promise.all(rows.flatMap((row) => row.places ? [mapSupabasePlaceWithPhotos(row.places)] : [])),
    source: 'supabase',
  }
}
