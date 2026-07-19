const NOMINATIM_BASE_URL = import.meta.env.VITE_NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org'

export type GeocodingResult = {
  placeId: number
  displayName: string
  latitude: number
  longitude: number
  type: string
}

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
}

type GeocodeSearchInput = {
  address: string
  area?: string
}

const resultCache = new Map<string, GeocodingResult[]>()
let lastRequestAt = 0

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function buildQuery({ address, area }: GeocodeSearchInput) {
  return [address.trim(), area?.trim(), 'Bandung', 'Jawa Barat', 'Indonesia']
    .filter(Boolean)
    .join(', ')
}

export async function searchAddress(input: GeocodeSearchInput) {
  const query = buildQuery(input)
  const cacheKey = query.toLowerCase()
  const cachedResults = resultCache.get(cacheKey)
  if (cachedResults) return { results: cachedResults }

  const elapsed = Date.now() - lastRequestAt
  if (elapsed < 1000) await wait(1000 - elapsed)
  lastRequestAt = Date.now()

  const url = new URL('/search', NOMINATIM_BASE_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'id')

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    return { results: [] as GeocodingResult[], error: 'Layanan pencarian alamat tidak dapat dihubungi.' }
  }

  if (!response.ok) {
    if (response.status === 429) {
      return { results: [] as GeocodingResult[], error: 'Pencarian terlalu sering. Tunggu sebentar lalu coba lagi.' }
    }
    return { results: [] as GeocodingResult[], error: `Pencarian alamat gagal (${response.status}).` }
  }

  const data = await response.json() as NominatimResult[]
  const results = data.flatMap((item) => {
    const latitude = Number(item.lat)
    const longitude = Number(item.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []

    return [{
      placeId: item.place_id,
      displayName: item.display_name,
      latitude,
      longitude,
      type: item.type,
    }]
  })

  resultCache.set(cacheKey, results)
  return { results }
}
