import type { DayKey } from '../types/place'
import {
  attachSubmissionPhotoUrls,
  fetchAllSubmissions,
  type PlaceSubmissionRecord,
  type SubmissionHourInput,
} from './submissions'
import { supabase } from './supabase'

export type AdminStats = {
  pendingSubmissions: number
  pendingReviews: number
  approvedPlaces: number
}

export type SubmissionEditInput = {
  name: string
  category: PlaceSubmissionRecord['category']
  priceRange: PlaceSubmissionRecord['priceRange']
  halalStatus: PlaceSubmissionRecord['halalStatus']
  description: string
  address: string
  area: string
  latitude: number
  longitude: number
  phone: string
  websiteUrl: string
  hours: Record<DayKey, SubmissionHourInput>
}

export type ModerationResult = {
  error?: string
}

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function slugify(value: string) {
  const cleanValue = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleanValue || 'tempat-kuliner'
}

function toHourRows(submissionId: string, hours: Record<DayKey, SubmissionHourInput>) {
  const dayNumbers: Record<DayKey, number> = {
    minggu: 0,
    senin: 1,
    selasa: 2,
    rabu: 3,
    kamis: 4,
    jumat: 5,
    sabtu: 6,
  }

  return Object.entries(hours).map(([day, value]) => ({
    submission_id: submissionId,
    day_of_week: dayNumbers[day as DayKey],
    is_closed: value.closed,
    is_24_hours: false,
    open_time: value.closed ? null : value.open,
    close_time: value.closed ? null : value.close,
  }))
}

function toPlaceHourRows(placeId: string, hours: Record<DayKey, SubmissionHourInput>) {
  return toHourRows(placeId, hours).map(({ submission_id, ...hour }) => ({
    place_id: submission_id,
    ...hour,
  }))
}

function logModeration(
  actorId: string,
  submission: PlaceSubmissionRecord,
  action: 'approve' | 'reject' | 'edit' | 'archive' | 'restore',
  toStatus: string,
  reason?: string,
  metadata?: Record<string, unknown>,
) {
  if (!supabase) return Promise.resolve<ModerationResult>({ error: missingSupabaseError() })

  return supabase.from('moderation_logs').insert({
    actor_id: actorId,
    entity_type: 'place_submission',
    entity_id: submission.id,
    action,
    from_status: submission.status,
    to_status: toStatus,
    reason: reason?.trim() || null,
    metadata: metadata ?? {},
  }).then(({ error }) => error ? { error: error.message } : {})
}

export async function fetchAdminWorkspace() {
  if (!supabase) return { submissions: [], stats: undefined, error: missingSupabaseError() }

  const [submissionResult, pendingReviewsResult, approvedPlacesResult] = await Promise.all([
    fetchAllSubmissions(),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('places').select('id', { count: 'exact', head: true }).eq('publication_status', 'approved'),
  ])

  if (pendingReviewsResult.error) return { submissions: [], stats: undefined, error: pendingReviewsResult.error.message }
  if (approvedPlacesResult.error) return { submissions: [], stats: undefined, error: approvedPlacesResult.error.message }
  if (submissionResult.error) return { submissions: [], stats: undefined, error: submissionResult.error }

  const contributorIds = [...new Set(submissionResult.submissions.map((submission) => submission.submittedBy))]
  const profileMap = new Map<string, string | null>()

  if (contributorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', contributorIds)

    if (profilesError) return { submissions: [], stats: undefined, error: profilesError.message }
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id as string, (profile.display_name as string | null) ?? null)
    }
  }

  const submissionsWithContributors = submissionResult.submissions.map((submission) => ({
    ...submission,
    contributorName: profileMap.get(submission.submittedBy) ?? null,
  }))

  return {
    submissions: await attachSubmissionPhotoUrls(submissionsWithContributors),
    stats: {
      pendingSubmissions: submissionsWithContributors.filter((submission) => submission.status === 'pending').length,
      pendingReviews: pendingReviewsResult.count ?? 0,
      approvedPlaces: approvedPlacesResult.count ?? 0,
    } satisfies AdminStats,
  }
}

export async function approveSubmission(adminId: string, submission: PlaceSubmissionRecord): Promise<ModerationResult> {
  if (!supabase) return { error: missingSupabaseError() }
  if (submission.status === 'approved' && submission.approvedPlaceId) {
    return { error: 'Usulan ini sudah disetujui.' }
  }

  const { data: place, error: placeError } = await supabase
    .from('places')
    .insert({
      slug: `${slugify(submission.name)}-${submission.id.slice(0, 8)}`,
      name: submission.name.trim(),
      category: submission.category,
      price_range: submission.priceRange,
      halal_status: submission.halalStatus,
      description: submission.description?.trim() || null,
      address: submission.address.trim(),
      area: submission.area?.trim() || null,
      latitude: submission.latitude,
      longitude: submission.longitude,
      phone: submission.phone?.trim() || null,
      website_url: submission.websiteUrl?.trim() || null,
      publication_status: 'approved',
      created_by: submission.submittedBy,
      updated_by: adminId,
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (placeError || !place) return { error: placeError?.message ?? 'Tempat publik gagal dibuat.' }

  const placeId = place.id as string
  const hours = submission.hours.map((hour) => ({
    place_id: placeId,
    day_of_week: hour.dayOfWeek,
    is_closed: hour.isClosed,
    is_24_hours: hour.is24Hours,
    open_time: hour.openTime,
    close_time: hour.closeTime,
  }))

  if (hours.length > 0) {
    const { error: hoursError } = await supabase.from('place_hours').insert(hours)
    if (hoursError) {
      await rollbackPlace(placeId)
      return { error: `Tempat dibuat, tetapi jam buka gagal disalin: ${hoursError.message}` }
    }
  }

  if (submission.photos.length > 0) {
    const { error: photosError } = await supabase.from('place_photos').insert(submission.photos.map((photo, index) => ({
      place_id: placeId,
      storage_path: photo.storagePath,
      caption: photo.caption,
      sort_order: index,
      is_cover: index === 0,
      publication_status: 'approved',
      uploaded_by: submission.submittedBy,
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
    })))

    if (photosError) {
      await rollbackPlace(placeId)
      return { error: `Tempat dibuat, tetapi foto gagal dipublikasikan: ${photosError.message}` }
    }
  }

  const { error: submissionError } = await supabase
    .from('place_submissions')
    .update({
      status: 'approved',
      rejection_reason: null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      approved_place_id: placeId,
    })
    .eq('id', submission.id)

  if (submissionError) {
    await rollbackPlace(placeId)
    return { error: submissionError.message }
  }

  const logResult = await logModeration(adminId, submission, 'approve', 'approved', undefined, { place_id: placeId })
  return logResult.error ? { error: `Usulan disetujui, tetapi log moderasi gagal: ${logResult.error}` } : {}
}

async function rollbackPlace(placeId: string) {
  if (!supabase) return
  await supabase.from('place_photos').delete().eq('place_id', placeId)
  await supabase.from('place_hours').delete().eq('place_id', placeId)
  await supabase.from('places').delete().eq('id', placeId)
}

export async function rejectSubmission(adminId: string, submission: PlaceSubmissionRecord, reason: string): Promise<ModerationResult> {
  if (!supabase) return { error: missingSupabaseError() }
  const cleanReason = reason.trim()
  if (!cleanReason) return { error: 'Alasan penolakan wajib diisi.' }
  if (submission.status === 'approved') return { error: 'Usulan yang sudah disetujui tidak dapat ditolak.' }

  const { error } = await supabase
    .from('place_submissions')
    .update({
      status: 'rejected',
      rejection_reason: cleanReason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submission.id)

  if (error) return { error: error.message }
  return logModeration(adminId, submission, 'reject', 'rejected', cleanReason)
}

export async function archiveSubmission(adminId: string, submission: PlaceSubmissionRecord): Promise<ModerationResult> {
  if (!supabase) return { error: missingSupabaseError() }

  const { error } = await supabase
    .from('place_submissions')
    .update({
      status: 'archived',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submission.id)

  if (error) return { error: error.message }

  if (submission.approvedPlaceId) {
    const { error: placeError } = await supabase
      .from('places')
      .update({ publication_status: 'archived', updated_by: adminId })
      .eq('id', submission.approvedPlaceId)

    if (placeError) return { error: `Usulan diarsipkan, tetapi tempat publik gagal diarsipkan: ${placeError.message}` }

    await supabase.from('place_photos').update({ publication_status: 'archived', moderated_by: adminId, moderated_at: new Date().toISOString() }).eq('place_id', submission.approvedPlaceId)
  }

  return logModeration(adminId, submission, 'archive', 'archived')
}

export async function restoreSubmission(adminId: string, submission: PlaceSubmissionRecord): Promise<ModerationResult> {
  if (!supabase) return { error: missingSupabaseError() }

  const nextStatus: SubmissionRecordStatus = submission.approvedPlaceId ? 'approved' : 'pending'
  const { error } = await supabase
    .from('place_submissions')
    .update({
      status: nextStatus,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq('id', submission.id)

  if (error) return { error: error.message }

  if (submission.approvedPlaceId) {
    const { error: placeError } = await supabase
      .from('places')
      .update({ publication_status: 'approved', updated_by: adminId })
      .eq('id', submission.approvedPlaceId)

    if (placeError) return { error: `Usulan dipulihkan, tetapi tempat publik gagal dipulihkan: ${placeError.message}` }

    await supabase.from('place_photos').update({ publication_status: 'approved', moderated_by: adminId, moderated_at: new Date().toISOString() }).eq('place_id', submission.approvedPlaceId)
  }

  return logModeration(adminId, submission, 'restore', nextStatus)
}

type SubmissionRecordStatus = 'pending' | 'approved'

export async function saveSubmissionEdit(
  adminId: string,
  submission: PlaceSubmissionRecord,
  input: SubmissionEditInput,
): Promise<ModerationResult> {
  if (!supabase) return { error: missingSupabaseError() }

  const submissionPatch = {
    name: input.name.trim(),
    category: input.category,
    price_range: input.priceRange,
    halal_status: input.halalStatus,
    description: input.description.trim() || null,
    address: input.address.trim(),
    area: input.area.trim() || null,
    latitude: input.latitude,
    longitude: input.longitude,
    phone: input.phone.trim() || null,
    website_url: input.websiteUrl.trim() || null,
  }

  const { error: submissionError } = await supabase
    .from('place_submissions')
    .update(submissionPatch)
    .eq('id', submission.id)

  if (submissionError) return { error: submissionError.message }

  const { error: submissionHoursError } = await supabase
    .from('place_submission_hours')
    .upsert(toHourRows(submission.id, input.hours), { onConflict: 'submission_id,day_of_week' })

  if (submissionHoursError) return { error: `Data utama tersimpan, tetapi jam buka gagal diperbarui: ${submissionHoursError.message}` }

  if (submission.approvedPlaceId) {
    const { error: placeError } = await supabase
      .from('places')
      .update({ ...submissionPatch, updated_by: adminId })
      .eq('id', submission.approvedPlaceId)

    if (placeError) return { error: `Usulan tersimpan, tetapi tempat publik gagal diperbarui: ${placeError.message}` }

    const { error: placeHoursError } = await supabase
      .from('place_hours')
      .upsert(toPlaceHourRows(submission.approvedPlaceId, input.hours), { onConflict: 'place_id,day_of_week' })

    if (placeHoursError) return { error: `Tempat diperbarui, tetapi jam buka publik gagal diperbarui: ${placeHoursError.message}` }
  }

  return logModeration(adminId, submission, 'edit', submission.status)
}
