import type { DayKey } from '../types/place'
import { supabase } from './supabase'

export const SUBMISSION_PHOTO_BUCKET = 'place-submission-photos'
export const MAX_SUBMISSION_PHOTOS = 5
export const MAX_SUBMISSION_PHOTO_SIZE = 5 * 1024 * 1024
export const SUPPORTED_SUBMISSION_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'archived'

export type SubmissionHourInput = {
  closed: boolean
  open: string
  close: string
}

export type SubmissionHourRecord = {
  dayOfWeek: number
  isClosed: boolean
  is24Hours: boolean
  openTime: string | null
  closeTime: string | null
}

export type SubmissionPhotoRecord = {
  id: string
  storagePath: string
  caption: string | null
  sortOrder: number
}

export type PlaceSubmissionRecord = {
  id: string
  submittedBy: string
  contributorName?: string | null
  name: string
  category: 'makanan' | 'minuman'
  priceRange: 'murah' | 'sedang' | 'mahal' | 'tidak_diketahui'
  halalStatus: 'halal' | 'non_halal' | 'belum_terverifikasi'
  description: string | null
  address: string
  area: string | null
  latitude: number
  longitude: number
  phone: string | null
  websiteUrl: string | null
  status: SubmissionStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  approvedPlaceId: string | null
  createdAt: string
  updatedAt: string
  hours: SubmissionHourRecord[]
  photos: SubmissionPhotoRecord[]
  photoUrls?: Record<string, string>
}

export type NewPlaceSubmissionInput = {
  name: string
  category: 'makanan' | 'minuman'
  priceRange: 'murah' | 'sedang' | 'mahal' | 'tidak_diketahui'
  halalStatus: 'halal' | 'non_halal' | 'belum_terverifikasi'
  description: string
  address: string
  area: string
  latitude: number
  longitude: number
  phone: string
  websiteUrl: string
  hours: Record<DayKey, SubmissionHourInput>
  photos?: File[]
}

export type SubmissionLoadResult = {
  submissions: PlaceSubmissionRecord[]
  error?: string
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

type SupabaseSubmissionHourRow = {
  day_of_week: number
  is_closed: boolean
  is_24_hours: boolean
  open_time: string | null
  close_time: string | null
}

type SupabaseSubmissionPhotoRow = {
  id: string
  storage_path: string
  caption: string | null
  sort_order: number
}

type SupabaseSubmissionRow = {
  id: string
  submitted_by: string
  name: string
  category: PlaceSubmissionRecord['category']
  price_range: PlaceSubmissionRecord['priceRange']
  halal_status: PlaceSubmissionRecord['halalStatus']
  description: string | null
  address: string
  area: string | null
  latitude: number
  longitude: number
  phone: string | null
  website_url: string | null
  status: SubmissionStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  approved_place_id: string | null
  created_at: string
  updated_at: string
  place_submission_hours: SupabaseSubmissionHourRow[] | null
  place_submission_photos: SupabaseSubmissionPhotoRow[] | null
}

const submissionSelect = `
  id,
  submitted_by,
  name,
  category,
  price_range,
  halal_status,
  description,
  address,
  area,
  latitude,
  longitude,
  phone,
  website_url,
  status,
  rejection_reason,
  reviewed_by,
  reviewed_at,
  approved_place_id,
  created_at,
  updated_at,
  place_submission_hours (
    day_of_week,
    is_closed,
    is_24_hours,
    open_time,
    close_time
  ),
  place_submission_photos (
    id,
    storage_path,
    caption,
    sort_order
  )
`

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function mapSubmission(row: SupabaseSubmissionRow): PlaceSubmissionRecord {
  return {
    id: row.id,
    submittedBy: row.submitted_by,
    name: row.name,
    category: row.category,
    priceRange: row.price_range,
    halalStatus: row.halal_status,
    description: row.description,
    address: row.address,
    area: row.area,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    phone: row.phone,
    websiteUrl: row.website_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    approvedPlaceId: row.approved_place_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hours: (row.place_submission_hours ?? []).map((hour) => ({
      dayOfWeek: hour.day_of_week,
      isClosed: hour.is_closed,
      is24Hours: hour.is_24_hours,
      openTime: hour.open_time,
      closeTime: hour.close_time,
    })).sort((left, right) => left.dayOfWeek - right.dayOfWeek),
    photos: (row.place_submission_photos ?? []).map((photo) => ({
      id: photo.id,
      storagePath: photo.storage_path,
      caption: photo.caption,
      sortOrder: photo.sort_order,
    })).sort((left, right) => left.sortOrder - right.sortOrder),
  }
}

async function fetchSubmissions(queryBuilder: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<SubmissionLoadResult> {
  const { data, error } = await queryBuilder

  if (error) return { submissions: [], error: error.message }

  return {
    submissions: ((data ?? []) as unknown as SupabaseSubmissionRow[]).map(mapSubmission),
  }
}

export async function fetchUserSubmissions(userId: string): Promise<SubmissionLoadResult> {
  if (!supabase) return { submissions: [], error: missingSupabaseError() }

  return fetchSubmissions(
    supabase
      .from('place_submissions')
      .select(submissionSelect)
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false }),
  )
}

export async function fetchAllSubmissions(): Promise<SubmissionLoadResult> {
  if (!supabase) return { submissions: [], error: missingSupabaseError() }

  return fetchSubmissions(
    supabase
      .from('place_submissions')
      .select(submissionSelect)
      .order('created_at', { ascending: false }),
  )
}

export async function attachSubmissionPhotoUrls(submissions: PlaceSubmissionRecord[]) {
  const client = supabase
  if (!client) return submissions

  return Promise.all(submissions.map(async (submission) => {
    const signedPhotos = await Promise.all(submission.photos.map(async (photo) => {
      const { data } = await client.storage
        .from(SUBMISSION_PHOTO_BUCKET)
        .createSignedUrl(photo.storagePath, 60 * 60)

      return data?.signedUrl ? [photo.id, data.signedUrl] as const : null
    }))

    return {
      ...submission,
      photoUrls: Object.fromEntries(signedPhotos.filter((photo): photo is readonly [string, string] => Boolean(photo))),
    }
  }))
}

export function validateSubmissionPhoto(file: File) {
  if (!SUPPORTED_SUBMISSION_PHOTO_TYPES.includes(file.type as typeof SUPPORTED_SUBMISSION_PHOTO_TYPES[number])) {
    return 'Gunakan foto JPG, PNG, atau WebP.'
  }
  if (file.size > MAX_SUBMISSION_PHOTO_SIZE) {
    return 'Ukuran setiap foto maksimal 5 MB.'
  }
  return undefined
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateSubmissionInput(input: NewPlaceSubmissionInput) {
  const name = input.name.trim()
  const description = input.description.trim()
  const address = input.address.trim()
  const area = input.area.trim()
  const phone = input.phone.trim()
  const websiteUrl = input.websiteUrl.trim()

  if (name.length < 2 || name.length > 120) return { error: 'Nama tempat harus berisi 2–120 karakter.' }
  if (address.length < 5 || address.length > 240) return { error: 'Alamat harus berisi 5–240 karakter.' }
  if (area.length > 120) return { error: 'Area maksimal 120 karakter.' }
  if (description.length > 2000) return { error: 'Deskripsi maksimal 2.000 karakter.' }
  if (phone.length > 40) return { error: 'Nomor kontak maksimal 40 karakter.' }
  if (websiteUrl && !isHttpUrl(websiteUrl)) return { error: 'Link usaha harus menggunakan URL http atau https yang valid.' }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) return { error: 'Latitude tidak valid.' }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) return { error: 'Longitude tidak valid.' }

  return { value: { name, description, address, area, phone, websiteUrl } }
}

async function uploadSubmissionPhotos(userId: string, submissionId: string, photos: File[]) {
  if (!supabase || photos.length === 0) return { paths: [] as string[] }
  if (photos.length > MAX_SUBMISSION_PHOTOS) {
    return { paths: [], error: `Maksimal ${MAX_SUBMISSION_PHOTOS} foto untuk satu usulan.` }
  }

  const uploadedPaths: string[] = []

  for (const photo of photos) {
    const validationError = validateSubmissionPhoto(photo)
    if (validationError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(SUBMISSION_PHOTO_BUCKET).remove(uploadedPaths)
      }
      return { paths: [], error: validationError }
    }

    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `${userId}/${submissionId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage
      .from(SUBMISSION_PHOTO_BUCKET)
      .upload(storagePath, photo, {
        cacheControl: '3600',
        contentType: photo.type,
        upsert: false,
      })

    if (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(SUBMISSION_PHOTO_BUCKET).remove(uploadedPaths)
      }
      return { paths: [], error: error.message }
    }

    uploadedPaths.push(storagePath)
  }

  const { error: metadataError } = await supabase
    .from('place_submission_photos')
    .insert(uploadedPaths.map((storagePath, index) => ({
      submission_id: submissionId,
      storage_path: storagePath,
      sort_order: index,
    })))

  if (metadataError) {
    await supabase.storage.from(SUBMISSION_PHOTO_BUCKET).remove(uploadedPaths)
    return { paths: [], error: metadataError.message }
  }

  return { paths: uploadedPaths }
}

export async function createPlaceSubmission(userId: string, input: NewPlaceSubmissionInput) {
  if (!supabase) return { error: missingSupabaseError() }

  const validation = validateSubmissionInput(input)
  if (validation.error || !validation.value) return { error: validation.error }

  const { data: submission, error: submissionError } = await supabase
    .from('place_submissions')
    .insert({
      submitted_by: userId,
      name: validation.value.name,
      category: input.category,
      price_range: input.priceRange,
      halal_status: input.halalStatus,
      description: validation.value.description || null,
      address: validation.value.address,
      area: validation.value.area || null,
      latitude: input.latitude,
      longitude: input.longitude,
      phone: validation.value.phone || null,
      website_url: validation.value.websiteUrl || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (submissionError || !submission) {
    if (submissionError?.code === 'P0001') return { error: submissionError.message }
    return { error: submissionError?.message ?? 'Usulan tempat gagal disimpan.' }
  }

  const submissionId = submission.id as string
  const hours = Object.entries(input.hours).map(([day, value]) => ({
    submission_id: submissionId,
    day_of_week: dayNumbers[day as DayKey],
    is_closed: value.closed,
    is_24_hours: false,
    open_time: value.closed ? null : value.open,
    close_time: value.closed ? null : value.close,
  }))

  const { error: hoursError } = await supabase.from('place_submission_hours').insert(hours)

  if (hoursError) {
    return { submissionId, error: `Usulan tersimpan, tetapi jam buka gagal disimpan: ${hoursError.message}` }
  }

  const photoResult = await uploadSubmissionPhotos(userId, submissionId, input.photos ?? [])

  if (photoResult.error) {
    return { submissionId, error: `Usulan tersimpan, tetapi foto gagal di-upload: ${photoResult.error}` }
  }

  return { submissionId }
}
