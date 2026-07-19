import type { DayKey } from '../types/place'
import {
  SUBMISSION_PHOTO_BUCKET,
  SUPPORTED_SUBMISSION_PHOTO_TYPES,
  MAX_SUBMISSION_PHOTO_SIZE,
  validateSubmissionPhoto,
} from './submissions'
import { supabase } from './supabase'

export const MAX_OWNER_PHOTOS_PER_UPLOAD = 5

export type OwnerHourInput = {
  closed: boolean
  is24Hours: boolean
  open: string
  close: string
}

export type OwnerPhotoRecord = {
  id: string
  storagePath: string
  caption: string | null
  sortOrder: number
  isCover: boolean
  publicationStatus: 'approved' | 'pending' | 'rejected' | 'archived'
  uploadedBy: string | null
  createdAt: string
  url?: string
}

export type OwnerPlaceRecord = {
  id: string
  name: string
  slug: string
  category: 'makanan' | 'minuman'
  priceRange: 'murah' | 'sedang' | 'mahal' | 'tidak_diketahui'
  halalStatus: 'halal' | 'non_halal' | 'belum_terverifikasi'
  description: string | null
  address: string
  area: string | null
  phone: string | null
  websiteUrl: string | null
  instagramUrl: string | null
  latitude: number
  longitude: number
  publicationStatus: 'approved' | 'pending' | 'rejected' | 'archived'
  updatedAt: string
  hours: Record<DayKey, OwnerHourInput>
  photos: OwnerPhotoRecord[]
}

export type OwnerPlaceUpdateInput = {
  description: string
  phone: string
  websiteUrl: string
  instagramUrl: string
  hours: Record<DayKey, OwnerHourInput>
}

type OwnerPlaceHourRow = {
  day_of_week: number
  is_closed: boolean
  is_24_hours: boolean
  open_time: string | null
  close_time: string | null
}

type OwnerPlacePhotoRow = {
  id: string
  storage_path: string
  caption: string | null
  sort_order: number
  is_cover: boolean
  publication_status: OwnerPhotoRecord['publicationStatus']
  uploaded_by: string | null
  created_at: string
}

type OwnerPlaceRow = {
  id: string
  name: string
  slug: string
  category: OwnerPlaceRecord['category']
  price_range: OwnerPlaceRecord['priceRange']
  halal_status: OwnerPlaceRecord['halalStatus']
  description: string | null
  address: string
  area: string | null
  phone: string | null
  website_url: string | null
  instagram_url: string | null
  latitude: number
  longitude: number
  publication_status: OwnerPlaceRecord['publicationStatus']
  updated_at: string
  place_hours: OwnerPlaceHourRow[] | null
  place_photos: OwnerPlacePhotoRow[] | null
}

const dayNumbers: Record<DayKey, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
}

const dayKeys: DayKey[] = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']

const ownerPlaceSelect = `
  id,
  name,
  slug,
  category,
  price_range,
  halal_status,
  description,
  address,
  area,
  phone,
  website_url,
  instagram_url,
  latitude,
  longitude,
  publication_status,
  updated_at,
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
    publication_status,
    uploaded_by,
    created_at
  )
`

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function defaultHours(): Record<DayKey, OwnerHourInput> {
  return {
    senin: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
    selasa: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
    rabu: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
    kamis: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
    jumat: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
    sabtu: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
    minggu: { closed: true, is24Hours: false, open: '10:00', close: '22:00' },
  }
}

function mapHours(rows: OwnerPlaceHourRow[] | null) {
  const hours = defaultHours()
  for (const row of rows ?? []) {
    const day = dayKeys[row.day_of_week]
    if (!day) continue
    hours[day] = {
      closed: row.is_closed,
      is24Hours: row.is_24_hours,
      open: row.open_time?.slice(0, 5) ?? '10:00',
      close: row.close_time?.slice(0, 5) ?? '22:00',
    }
  }
  return hours
}

async function mapOwnerPlace(row: OwnerPlaceRow, client: NonNullable<typeof supabase>): Promise<OwnerPlaceRecord> {
  const photos = await Promise.all((row.place_photos ?? []).map(async (photo) => {
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
      uploadedBy: photo.uploaded_by,
      createdAt: photo.created_at,
      url: data?.signedUrl,
    }
  }))

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    priceRange: row.price_range,
    halalStatus: row.halal_status,
    description: row.description,
    address: row.address,
    area: row.area,
    phone: row.phone,
    websiteUrl: row.website_url,
    instagramUrl: row.instagram_url,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    publicationStatus: row.publication_status,
    updatedAt: row.updated_at,
    hours: mapHours(row.place_hours),
    photos: photos.sort((left, right) => Number(right.isCover) - Number(left.isCover) || left.sortOrder - right.sortOrder),
  }
}

export async function fetchOwnedPlaces(userId: string) {
  if (!supabase) return { places: [] as OwnerPlaceRecord[], error: missingSupabaseError() }
  const client = supabase

  const { data: managers, error: managersError } = await client
    .from('place_managers')
    .select('place_id')
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (managersError) return { places: [] as OwnerPlaceRecord[], error: managersError.message }

  const placeIds = [...new Set((managers ?? []).map((manager) => manager.place_id as string))]
  if (placeIds.length === 0) return { places: [] as OwnerPlaceRecord[] }

  const { data, error } = await client
    .from('places')
    .select(ownerPlaceSelect)
    .in('id', placeIds)
    .order('name', { ascending: true })

  if (error) return { places: [] as OwnerPlaceRecord[], error: error.message }

  const places = await Promise.all(((data ?? []) as unknown as OwnerPlaceRow[]).map((row) => mapOwnerPlace(row, client)))
  return { places }
}

function validateUrl(value: string, label: string) {
  const cleanValue = value.trim()
  if (!cleanValue) return { value: null as string | null }
  if (cleanValue.length > 300) return { error: `${label} maksimal 300 karakter.` }

  try {
    const url = new URL(cleanValue)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: `${label} harus menggunakan URL http atau https.` }
  } catch {
    return { error: `${label} belum berupa URL yang valid.` }
  }

  return { value: cleanValue }
}

function toPlaceHourRows(hours: Record<DayKey, OwnerHourInput>, placeId: string) {
  return Object.entries(hours).map(([day, value]) => ({
    place_id: placeId,
    day_of_week: dayNumbers[day as DayKey],
    is_closed: value.closed,
    is_24_hours: value.closed ? false : value.is24Hours,
    open_time: value.closed || value.is24Hours ? null : value.open,
    close_time: value.closed || value.is24Hours ? null : value.close,
  }))
}

export async function updateOwnedPlace(userId: string, placeId: string, input: OwnerPlaceUpdateInput) {
  if (!supabase) return { error: missingSupabaseError() }

  const description = input.description.trim()
  const phone = input.phone.trim()
  if (description.length > 2000) return { error: 'Deskripsi maksimal 2.000 karakter.' }
  if (phone.length > 40) return { error: 'Nomor kontak maksimal 40 karakter.' }
  const websiteResult = validateUrl(input.websiteUrl, 'Link website')
  if (websiteResult.error) return { error: websiteResult.error }
  const instagramResult = validateUrl(input.instagramUrl, 'Link Instagram')
  if (instagramResult.error) return { error: instagramResult.error }

  for (const day of dayKeys) {
    const hour = input.hours[day]
    if (!hour || hour.closed || hour.is24Hours) continue
    if (!hour.open || !hour.close) return { error: `Lengkapi jam buka dan tutup untuk hari ${day}.` }
  }

  const { error: placeError } = await supabase
    .from('places')
    .update({
      description: description || null,
      phone: phone || null,
      website_url: websiteResult.value,
      instagram_url: instagramResult.value,
      updated_by: userId,
    })
    .eq('id', placeId)

  if (placeError) return { error: placeError.message }

  const { error: hoursError } = await supabase
    .from('place_hours')
    .upsert(toPlaceHourRows(input.hours, placeId), { onConflict: 'place_id,day_of_week' })

  if (hoursError) return { error: `Informasi tersimpan, tetapi jam buka gagal diperbarui: ${hoursError.message}` }
  return {}
}

function ownerPhotoExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function validateOwnerPhoto(file: File) {
  if (!SUPPORTED_SUBMISSION_PHOTO_TYPES.includes(file.type as typeof SUPPORTED_SUBMISSION_PHOTO_TYPES[number])) return 'Gunakan foto JPG, PNG, atau WebP.'
  if (file.size === 0 || file.size > MAX_SUBMISSION_PHOTO_SIZE) return 'Ukuran setiap foto maksimal 5 MB.'
  return validateSubmissionPhoto(file)
}

export async function uploadOwnerPhotos(userId: string, placeId: string, files: File[], existingPhotos: OwnerPhotoRecord[]) {
  if (!supabase) return { error: missingSupabaseError() }
  if (files.length === 0) return { error: 'Pilih minimal satu foto.' }
  if (files.length > MAX_OWNER_PHOTOS_PER_UPLOAD) return { error: `Maksimal ${MAX_OWNER_PHOTOS_PER_UPLOAD} foto per upload.` }

  for (const file of files) {
    const validationError = validateOwnerPhoto(file)
    if (validationError) return { error: validationError }
  }

  const uploadedPaths: string[] = []
  for (const file of files) {
    const path = `${userId}/owner/${placeId}/${crypto.randomUUID()}.${ownerPhotoExtension(file)}`
    const { error } = await supabase.storage
      .from(SUBMISSION_PHOTO_BUCKET)
      .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (error) {
      if (uploadedPaths.length > 0) await supabase.storage.from(SUBMISSION_PHOTO_BUCKET).remove(uploadedPaths)
      return { error: `Foto gagal diunggah: ${error.message}` }
    }
    uploadedPaths.push(path)
  }

  const maxSortOrder = existingPhotos.reduce((highest, photo) => Math.max(highest, photo.sortOrder), -1)
  const hasCover = existingPhotos.some((photo) => photo.isCover && photo.publicationStatus === 'approved')
  const { error: metadataError } = await supabase
    .from('place_photos')
    .insert(uploadedPaths.map((storagePath, index) => ({
      place_id: placeId,
      storage_path: storagePath,
      caption: null,
      sort_order: maxSortOrder + index + 1,
      is_cover: !hasCover && index === 0,
      publication_status: 'approved',
      uploaded_by: userId,
      moderated_by: null,
      moderated_at: null,
    })))

  if (metadataError) {
    await supabase.storage.from(SUBMISSION_PHOTO_BUCKET).remove(uploadedPaths)
    return { error: `Foto terunggah, tetapi metadata gagal disimpan: ${metadataError.message}` }
  }

  return {}
}

export async function deleteOwnedPhoto(placeId: string, photo: OwnerPhotoRecord) {
  if (!supabase) return { error: missingSupabaseError() }

  const { error } = await supabase
    .from('place_photos')
    .delete()
    .eq('id', photo.id)
    .eq('place_id', placeId)

  if (error) return { error: error.message }

  await supabase.storage.from(SUBMISSION_PHOTO_BUCKET).remove([photo.storagePath])

  if (photo.isCover) {
    const { data: fallback } = await supabase
      .from('place_photos')
      .select('id')
      .eq('place_id', placeId)
      .eq('publication_status', 'approved')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fallback?.id) {
      await supabase.from('place_photos').update({ is_cover: true }).eq('id', fallback.id).eq('place_id', placeId)
    }
  }

  return {}
}

export async function setOwnedPhotoCover(placeId: string, photoId: string) {
  if (!supabase) return { error: missingSupabaseError() }

  const { error: clearError } = await supabase
    .from('place_photos')
    .update({ is_cover: false })
    .eq('place_id', placeId)

  if (clearError) return { error: clearError.message }

  const { error } = await supabase
    .from('place_photos')
    .update({ is_cover: true })
    .eq('id', photoId)
    .eq('place_id', placeId)

  return error ? { error: error.message } : {}
}
