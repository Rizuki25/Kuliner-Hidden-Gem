import { supabase } from './supabase'

export type ReportEntityType = 'place' | 'review' | 'place_photo'
export type ReportReason = 'spam' | 'informasi_salah' | 'konten_menyinggung' | 'tempat_tutup' | 'lainnya'
export type ReportStatus = 'pending' | 'ignored' | 'actioned'

export const reportReasonLabels: Record<ReportReason, string> = {
  spam: 'Spam atau iklan',
  informasi_salah: 'Informasi sudah salah',
  konten_menyinggung: 'Konten menyinggung',
  tempat_tutup: 'Tempat sudah tutup',
  lainnya: 'Alasan lainnya',
}

export const reportEntityLabels: Record<ReportEntityType, string> = {
  place: 'Tempat',
  review: 'Ulasan',
  place_photo: 'Foto tempat',
}

export type ContentReportInput = {
  entityType: ReportEntityType
  entityId: string
  reason: ReportReason
  details: string
}

export type ContentReportRecord = {
  id: string
  reportedBy: string
  entityType: ReportEntityType
  entityId: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ContentReportAdminRecord = ContentReportRecord & {
  reporterName: string | null
  entityLabel: string
  entitySubtitle: string | null
  entityPlaceId: string | null
  entityPhotoUrl?: string
}

type ContentReportRow = {
  id: string
  reported_by: string
  entity_type: ReportEntityType
  entity_id: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

type PlaceNameRow = { id: string; name: string }
type ReviewContextRow = { id: string; place_id: string; rating: number; body: string; status: string }
type PhotoContextRow = { id: string; place_id: string; storage_path: string }

const reportSelect = `
  id,
  reported_by,
  entity_type,
  entity_id,
  reason,
  details,
  status,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
`

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function mapReport(row: ContentReportRow): ContentReportRecord {
  return {
    id: row.id,
    reportedBy: row.reported_by,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function submitContentReport(userId: string, input: ContentReportInput) {
  if (!supabase) return { error: missingSupabaseError() }
  const details = input.details.trim()
  if (details.length > 1000) return { error: 'Detail laporan maksimal 1.000 karakter.' }

  const { data: existing, error: existingError } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reported_by', userId)
    .eq('entity_type', input.entityType)
    .eq('entity_id', input.entityId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (existingError) return { error: existingError.message }
  if (existing) return { error: 'Laporan untuk konten ini masih sedang ditinjau.' }

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reported_by: userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      reason: input.reason,
      details: details || null,
      status: 'pending',
    })
    .select(reportSelect)
    .single()

  if (error || !data) return { error: error?.message ?? 'Laporan gagal dikirim.' }
  return { report: mapReport(data as unknown as ContentReportRow) }
}

async function fetchProfileNames(client: NonNullable<typeof supabase>, userIds: string[]) {
  if (userIds.length === 0) return { names: new Map<string, string | null>() }
  const { data, error } = await client.from('profiles').select('id, display_name').in('id', userIds)
  if (error) return { names: new Map<string, string | null>(), error: error.message }

  const names = new Map<string, string | null>()
  for (const profile of data ?? []) names.set(profile.id as string, (profile.display_name as string | null) ?? null)
  return { names }
}

export async function fetchAdminReports() {
  if (!supabase) return { reports: [] as ContentReportAdminRecord[], error: missingSupabaseError() }
  const client = supabase

  const { data, error } = await client
    .from('content_reports')
    .select(reportSelect)
    .order('created_at', { ascending: false })

  if (error) return { reports: [] as ContentReportAdminRecord[], error: error.message }

  const rows = (data ?? []) as unknown as ContentReportRow[]
  const placeIds = [...new Set(rows.filter((row) => row.entity_type === 'place').map((row) => row.entity_id))]
  const reviewIds = [...new Set(rows.filter((row) => row.entity_type === 'review').map((row) => row.entity_id))]
  const photoIds = [...new Set(rows.filter((row) => row.entity_type === 'place_photo').map((row) => row.entity_id))]
  const reporterIds = [...new Set(rows.map((row) => row.reported_by))]

  const [placesResult, reviewsResult, photosResult, profilesResult] = await Promise.all([
    placeIds.length > 0 ? client.from('places').select('id, name').in('id', placeIds) : Promise.resolve({ data: [], error: null }),
    reviewIds.length > 0 ? client.from('reviews').select('id, place_id, rating, body, status').in('id', reviewIds) : Promise.resolve({ data: [], error: null }),
    photoIds.length > 0 ? client.from('place_photos').select('id, place_id, storage_path').in('id', photoIds) : Promise.resolve({ data: [], error: null }),
    fetchProfileNames(client, reporterIds),
  ])

  if (placesResult.error) return { reports: [] as ContentReportAdminRecord[], error: placesResult.error.message }
  if (reviewsResult.error) return { reports: [] as ContentReportAdminRecord[], error: reviewsResult.error.message }
  if (photosResult.error) return { reports: [] as ContentReportAdminRecord[], error: photosResult.error.message }
  if (profilesResult.error) return { reports: [] as ContentReportAdminRecord[], error: profilesResult.error }

  const placeNames = new Map<string, string>()
  for (const place of (placesResult.data ?? []) as unknown as PlaceNameRow[]) placeNames.set(place.id, place.name)
  const reviewContexts = new Map<string, ReviewContextRow>()
  for (const review of (reviewsResult.data ?? []) as unknown as ReviewContextRow[]) reviewContexts.set(review.id, review)
  const photoContexts = new Map<string, PhotoContextRow>()
  for (const photo of (photosResult.data ?? []) as unknown as PhotoContextRow[]) photoContexts.set(photo.id, photo)

  const reports = await Promise.all(rows.map(async (row) => {
    const base = mapReport(row)
    const reporterName = profilesResult.names.get(row.reported_by) ?? null
    let entityLabel = `${reportEntityLabels[row.entity_type]} tidak ditemukan`
    let entitySubtitle: string | null = null
    let entityPlaceId: string | null = null
    let entityPhotoUrl: string | undefined

    if (row.entity_type === 'place') {
      entityLabel = placeNames.get(row.entity_id) ?? entityLabel
      entityPlaceId = row.entity_id
    } else if (row.entity_type === 'review') {
      const review = reviewContexts.get(row.entity_id)
      entityPlaceId = review?.place_id ?? null
      entityLabel = review ? `Ulasan di ${placeNames.get(review.place_id) ?? 'tempat tidak ditemukan'}` : entityLabel
      entitySubtitle = review ? `${review.rating}/5 · ${review.body}` : null
    } else {
      const photo = photoContexts.get(row.entity_id)
      entityPlaceId = photo?.place_id ?? null
      entityLabel = photo ? `Foto ${placeNames.get(photo.place_id) ?? 'tempat tidak ditemukan'}` : entityLabel
      if (photo) {
        const { data: signedUrl } = await client.storage.from('place-submission-photos').createSignedUrl(photo.storage_path, 60 * 60)
        entityPhotoUrl = signedUrl?.signedUrl
      }
    }

    return { ...base, reporterName, entityLabel, entitySubtitle, entityPlaceId, entityPhotoUrl }
  }))

  return { reports }
}

function logReportModeration(
  adminId: string,
  report: ContentReportAdminRecord,
  status: 'ignored' | 'actioned',
  action: 'archive' | 'edit',
) {
  if (!supabase) return Promise.resolve({ error: missingSupabaseError() })
  return supabase.from('moderation_logs').insert({
    actor_id: adminId,
    entity_type: 'report',
    entity_id: report.id,
    action,
    from_status: report.status,
    to_status: status,
    reason: report.reason,
    metadata: { reported_entity_type: report.entityType, reported_entity_id: report.entityId },
  }).then(({ error }) => error ? { error: error.message } : {})
}

async function updateReportStatus(adminId: string, report: ContentReportAdminRecord, status: 'ignored' | 'actioned', action: 'archive' | 'edit') {
  if (!supabase) return { error: missingSupabaseError() }
  if (report.status !== 'pending') return { error: 'Laporan ini sudah ditinjau.' }

  const { error } = await supabase
    .from('content_reports')
    .update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq('id', report.id)

  if (error) return { error: error.message }
  return logReportModeration(adminId, report, status, action)
}

export async function ignoreReport(adminId: string, report: ContentReportAdminRecord) {
  return updateReportStatus(adminId, report, 'ignored', 'archive')
}

export async function actionReport(adminId: string, report: ContentReportAdminRecord) {
  return updateReportStatus(adminId, report, 'actioned', 'edit')
}

export async function archiveReportedContent(adminId: string, report: ContentReportAdminRecord) {
  if (!supabase) return { error: missingSupabaseError() }
  if (report.status !== 'pending') return { error: 'Laporan ini sudah ditinjau.' }

  let error: { message: string } | null = null
  if (report.entityType === 'place') {
    const result = await supabase.from('places').update({ publication_status: 'archived', updated_by: adminId }).eq('id', report.entityId)
    error = result.error
  } else if (report.entityType === 'review') {
    const result = await supabase.from('reviews').update({ status: 'archived', moderation_reason: 'Diarsipkan setelah laporan konten.', moderated_by: adminId, moderated_at: new Date().toISOString() }).eq('id', report.entityId)
    error = result.error
  } else {
    const result = await supabase.from('place_photos').update({ publication_status: 'archived', moderated_by: adminId, moderated_at: new Date().toISOString() }).eq('id', report.entityId)
    error = result.error
  }

  if (error) return { error: error.message }
  return updateReportStatus(adminId, report, 'actioned', 'archive')
}
