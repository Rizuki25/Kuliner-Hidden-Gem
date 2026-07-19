export type FoodCategory = 'Makanan' | 'Minuman'
export type HalalStatus = 'halal' | 'non-halal' | 'belum-terverifikasi'
export type PriceRange = 'murah' | 'sedang' | 'mahal' | 'tidak-diketahui'

export type DayKey =
  | 'senin'
  | 'selasa'
  | 'rabu'
  | 'kamis'
  | 'jumat'
  | 'sabtu'
  | 'minggu'

export type OpeningHour = {
  open?: string
  close?: string
  closed?: boolean
}

export type Place = {
  id: string
  name: string
  tagline: string
  category: FoodCategory
  priceRange: PriceRange
  halalStatus: HalalStatus
  rating: number
  reviewCount: number
  distanceKm?: number
  address: string
  area: string
  accent: string
  emoji: string
  lat: number
  lng: number
  isOpen: boolean
  description: string
  phone?: string
  websiteUrl?: string
  instagramUrl?: string
  highlights: string[]
  openingHours: Record<DayKey, OpeningHour>
  photoUrls?: string[]
}

export const dayLabels: Record<DayKey, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
}

export const dayOrder: DayKey[] = [
  'senin',
  'selasa',
  'rabu',
  'kamis',
  'jumat',
  'sabtu',
  'minggu',
]

export const priceLabels: Record<PriceRange, string> = {
  murah: 'Di bawah 25K',
  sedang: '25K–60K',
  mahal: 'Di atas 60K',
  'tidak-diketahui': 'Harga belum tersedia',
}

export const halalLabels: Record<HalalStatus, string> = {
  halal: 'Halal',
  'non-halal': 'Non-halal',
  'belum-terverifikasi': 'Belum terverifikasi',
}
