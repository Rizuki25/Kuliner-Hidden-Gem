import { supabase } from './supabase'

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'archived'

export type ReviewRecord = {
  id: string
  placeId: string
  userId: string
  rating: number
  body: string
  status: ReviewStatus
  moderationReason: string | null
  moderatedBy: string | null
  moderatedAt: string | null
  createdAt: string
  updatedAt: string
  authorName?: string | null
}

export type ReviewModerationRecord = ReviewRecord & {
  placeName: string
  contributorName: string | null
}

export type ReviewInput = {
  rating: number
  body: string
}

type ReviewRow = {
  id: string
  place_id: string
  user_id: string
  rating: number
  body: string
  status: ReviewStatus
  moderation_reason: string | null
  moderated_by: string | null
  moderated_at: string | null
  created_at: string
  updated_at: string
}

const reviewSelect = `
  id,
  place_id,
  user_id,
  rating,
  body,
  status,
  moderation_reason,
  moderated_by,
  moderated_at,
  created_at,
  updated_at
`

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function mapReview(row: ReviewRow, authorName?: string | null): ReviewRecord {
  return {
    id: row.id,
    placeId: row.place_id,
    userId: row.user_id,
    rating: Number(row.rating),
    body: row.body,
    status: row.status,
    moderationReason: row.moderation_reason,
    moderatedBy: row.moderated_by,
    moderatedAt: row.moderated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName,
  }
}

async function fetchProfileNames(userIds: string[]) {
  if (!supabase || userIds.length === 0) return { names: new Map<string, string | null>() }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  if (error) return { names: new Map<string, string | null>(), error: error.message }

  const names = new Map<string, string | null>()
  for (const profile of data ?? []) {
    names.set(profile.id as string, (profile.display_name as string | null) ?? null)
  }
  return { names }
}

export async function fetchPlaceReviews(placeId: string, userId?: string) {
  if (!supabase) return { reviews: [] as ReviewRecord[] }

  const { data, error } = await supabase
    .from('reviews')
    .select(reviewSelect)
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })

  if (error) return { reviews: [] as ReviewRecord[], error: error.message }

  const rows = (data ?? []) as unknown as ReviewRow[]
  const profileResult = await fetchProfileNames([...new Set(rows.map((row) => row.user_id))])
  if (profileResult.error) return { reviews: [] as ReviewRecord[], error: profileResult.error }

  const mappedReviews = rows.map((row) => mapReview(row, profileResult.names.get(row.user_id) ?? null))
  const ownReview = userId ? mappedReviews.find((review) => review.userId === userId) : undefined

  return {
    reviews: mappedReviews.filter((review) => review.status === 'approved'),
    ownReview,
  }
}

export async function saveReview(userId: string, placeId: string, input: ReviewInput, existingReview?: ReviewRecord) {
  if (!supabase) return { error: missingSupabaseError() }

  const rating = Number(input.rating)
  const body = input.body.trim()
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Pilih rating antara 1 sampai 5.' }
  }
  if (body.length < 3 || body.length > 2000) {
    return { error: 'Ulasan harus berisi 3 sampai 2.000 karakter.' }
  }

  const reviewPatch = {
    rating,
    body,
    status: 'pending' as ReviewStatus,
    moderation_reason: null,
    moderated_by: null,
    moderated_at: null,
  }

  if (existingReview) {
    const { data, error } = await supabase
      .from('reviews')
      .update(reviewPatch)
      .eq('id', existingReview.id)
      .eq('user_id', userId)
      .select(reviewSelect)
      .single()

    if (error || !data) return { error: error?.message ?? 'Ulasan gagal diperbarui.' }
    return { review: mapReview(data as unknown as ReviewRow) }
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      place_id: placeId,
      user_id: userId,
      ...reviewPatch,
    })
    .select(reviewSelect)
    .single()

  if (error || !data) {
    if (error?.code === '23505') return { error: 'Kamu sudah memiliki ulasan aktif untuk tempat ini.' }
    return { error: error?.message ?? 'Ulasan gagal dikirim.' }
  }

  return { review: mapReview(data as unknown as ReviewRow) }
}

export async function deleteReview(userId: string, reviewId: string) {
  if (!supabase) return { error: missingSupabaseError() }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId)

  return error ? { error: error.message } : {}
}

export async function fetchAdminReviews() {
  if (!supabase) return { reviews: [] as ReviewModerationRecord[], error: missingSupabaseError() }

  const { data, error } = await supabase
    .from('reviews')
    .select(reviewSelect)
    .order('created_at', { ascending: false })

  if (error) return { reviews: [] as ReviewModerationRecord[], error: error.message }

  const rows = (data ?? []) as unknown as ReviewRow[]
  const placeIds = [...new Set(rows.map((row) => row.place_id))]
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const [placesResult, profilesResult] = await Promise.all([
    placeIds.length > 0
      ? supabase.from('places').select('id, name').in('id', placeIds)
      : Promise.resolve({ data: [], error: null }),
    fetchProfileNames(userIds),
  ])

  if (placesResult.error) return { reviews: [] as ReviewModerationRecord[], error: placesResult.error.message }
  if (profilesResult.error) return { reviews: [] as ReviewModerationRecord[], error: profilesResult.error }

  const placeNames = new Map<string, string>()
  for (const place of placesResult.data ?? []) {
    placeNames.set(place.id as string, place.name as string)
  }

  return {
    reviews: rows.map((row) => {
      const contributorName = profilesResult.names.get(row.user_id) ?? null
      return {
        ...mapReview(row, contributorName),
        placeName: placeNames.get(row.place_id) ?? 'Tempat tidak ditemukan',
        contributorName,
      }
    }),
  }
}
