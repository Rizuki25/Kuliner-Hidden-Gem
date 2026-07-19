import { supabase } from './supabase'

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export const BUSINESS_CLAIM_PROOF_BUCKET = 'business-claim-proofs'
export const BUSINESS_CLAIM_PROOF_MAX_SIZE = 10 * 1024 * 1024
export const BUSINESS_CLAIM_PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const

export type BusinessClaimRecord = {
  id: string
  placeId: string
  claimantId: string
  contactName: string
  contactPhone: string
  contactEmail: string | null
  proofStoragePath: string
  proofUrl?: string
  notes: string | null
  status: ClaimStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type BusinessClaimAdminRecord = BusinessClaimRecord & {
  placeName: string
  claimantName: string | null
}

export type BusinessClaimInput = {
  contactName: string
  contactPhone: string
  contactEmail: string
  notes: string
}

type BusinessClaimRow = {
  id: string
  place_id: string
  claimant_id: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  proof_storage_path: string
  notes: string | null
  status: ClaimStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

const claimSelect = `
  id,
  place_id,
  claimant_id,
  contact_name,
  contact_phone,
  contact_email,
  proof_storage_path,
  notes,
  status,
  rejection_reason,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
`

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function mapClaim(row: BusinessClaimRow, proofUrl?: string): BusinessClaimRecord {
  return {
    id: row.id,
    placeId: row.place_id,
    claimantId: row.claimant_id,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    proofStoragePath: row.proof_storage_path,
    proofUrl,
    notes: row.notes,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function fileExtension(file: File) {
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

function validateClaimInput(input: BusinessClaimInput, proof: File) {
  const contactName = input.contactName.trim()
  const contactPhone = input.contactPhone.trim()
  const contactEmail = input.contactEmail.trim()
  const notes = input.notes.trim()

  if (contactName.length < 2 || contactName.length > 120) return { error: 'Nama pemilik atau penanggung jawab harus berisi 2–120 karakter.' }
  if (contactPhone.length < 6 || contactPhone.length > 40) return { error: 'Nomor kontak harus berisi 6–40 karakter.' }
  if (contactEmail && (contactEmail.length > 160 || !/^\S+@\S+\.\S+$/.test(contactEmail))) return { error: 'Format email kontak belum valid.' }
  if (notes.length > 2000) return { error: 'Catatan klaim maksimal 2.000 karakter.' }
  if (!BUSINESS_CLAIM_PROOF_TYPES.includes(proof.type as typeof BUSINESS_CLAIM_PROOF_TYPES[number])) return { error: 'Bukti harus berupa PDF, JPG, PNG, atau WebP.' }
  if (proof.size === 0 || proof.size > BUSINESS_CLAIM_PROOF_MAX_SIZE) return { error: 'Ukuran bukti maksimal 10 MB.' }

  return { value: { contactName, contactPhone, contactEmail, notes } }
}

export async function fetchPlaceClaim(placeId: string, userId: string) {
  if (!supabase) return { claim: undefined, isManager: false, error: missingSupabaseError() }

  const [claimResult, managerResult] = await Promise.all([
    supabase
      .from('business_claims')
      .select(claimSelect)
      .eq('place_id', placeId)
      .eq('claimant_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('place_managers')
      .select('place_id, revoked_at')
      .eq('place_id', placeId)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .maybeSingle(),
  ])

  if (claimResult.error) return { claim: undefined, isManager: false, error: claimResult.error.message }
  if (managerResult.error) return { claim: undefined, isManager: false, error: managerResult.error.message }

  return {
    claim: claimResult.data ? mapClaim(claimResult.data as unknown as BusinessClaimRow) : undefined,
    isManager: Boolean(managerResult.data),
  }
}

export async function submitBusinessClaim(userId: string, placeId: string, input: BusinessClaimInput, proof: File) {
  if (!supabase) return { error: missingSupabaseError() }

  const validation = validateClaimInput(input, proof)
  if (validation.error || !validation.value) return { error: validation.error }

  const claimId = crypto.randomUUID()
  const storagePath = `${userId}/${claimId}/${crypto.randomUUID()}.${fileExtension(proof)}`
  const { error: uploadError } = await supabase.storage
    .from(BUSINESS_CLAIM_PROOF_BUCKET)
    .upload(storagePath, proof, { cacheControl: '3600', contentType: proof.type, upsert: false })

  if (uploadError) return { error: `Bukti gagal diunggah: ${uploadError.message}` }

  const { data, error } = await supabase
    .from('business_claims')
    .insert({
      id: claimId,
      place_id: placeId,
      claimant_id: userId,
      contact_name: validation.value.contactName,
      contact_phone: validation.value.contactPhone,
      contact_email: validation.value.contactEmail || null,
      proof_storage_path: storagePath,
      notes: validation.value.notes || null,
      status: 'pending',
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .select(claimSelect)
    .single()

  if (error || !data) {
    await supabase.storage.from(BUSINESS_CLAIM_PROOF_BUCKET).remove([storagePath])
    if (error?.code === '23505') return { error: 'Kamu masih memiliki pengajuan klaim yang sedang menunggu peninjauan.' }
    return { error: error?.message ?? 'Pengajuan klaim gagal disimpan.' }
  }

  return { claim: mapClaim(data as unknown as BusinessClaimRow) }
}

async function fetchProfileNames(userIds: string[]) {
  if (!supabase || userIds.length === 0) return { names: new Map<string, string | null>() }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  if (error) return { names: new Map<string, string | null>(), error: error.message }

  const names = new Map<string, string | null>()
  for (const profile of data ?? []) names.set(profile.id as string, (profile.display_name as string | null) ?? null)
  return { names }
}

export async function fetchAdminClaims() {
  if (!supabase) return { claims: [] as BusinessClaimAdminRecord[], error: missingSupabaseError() }
  const client = supabase

  const { data, error } = await client
    .from('business_claims')
    .select(claimSelect)
    .order('created_at', { ascending: false })

  if (error) return { claims: [] as BusinessClaimAdminRecord[], error: error.message }

  const rows = (data ?? []) as unknown as BusinessClaimRow[]
  const placeIds = [...new Set(rows.map((row) => row.place_id))]
  const claimantIds = [...new Set(rows.map((row) => row.claimant_id))]
  const [placesResult, profilesResult] = await Promise.all([
    placeIds.length > 0
      ? client.from('places').select('id, name').in('id', placeIds)
      : Promise.resolve({ data: [], error: null }),
    fetchProfileNames(claimantIds),
  ])

  if (placesResult.error) return { claims: [] as BusinessClaimAdminRecord[], error: placesResult.error.message }
  if (profilesResult.error) return { claims: [] as BusinessClaimAdminRecord[], error: profilesResult.error }

  const placeNames = new Map<string, string>()
  for (const place of placesResult.data ?? []) placeNames.set(place.id as string, place.name as string)

  const claims = await Promise.all(rows.map(async (row) => {
    const { data: signedUrl } = await client.storage
      .from(BUSINESS_CLAIM_PROOF_BUCKET)
      .createSignedUrl(row.proof_storage_path, 60 * 60)
    const claimantName = profilesResult.names.get(row.claimant_id) ?? null
    return {
      ...mapClaim(row, signedUrl?.signedUrl),
      placeName: placeNames.get(row.place_id) ?? 'Tempat tidak ditemukan',
      claimantName,
    }
  }))

  return { claims }
}
