import { supabase } from './supabase'

export type ProfileRole = 'user' | 'owner' | 'admin'

export type ProfileRecord = {
  id: string
  displayName: string | null
  avatarUrl: string | null
  role: ProfileRole
  createdAt: string
}

function missingSupabaseError() {
  return 'Supabase belum dikonfigurasi. Periksa file .env.local.'
}

function mapProfile(row: Record<string, unknown>): ProfileRecord {
  return {
    id: row.id as string,
    displayName: (row.display_name as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    role: (row.role as ProfileRole) ?? 'user',
    createdAt: row.created_at as string,
  }
}

export async function fetchProfile(userId: string) {
  if (!supabase) return { profile: undefined, error: missingSupabaseError() }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) return { profile: undefined, error: error.message }
  return { profile: data ? mapProfile(data as Record<string, unknown>) : undefined }
}

export async function updateProfile(userId: string, displayName: string) {
  if (!supabase) return { error: missingSupabaseError() }
  const normalizedName = displayName.trim()
  if (normalizedName.length < 2 || normalizedName.length > 80) return { error: 'Nama tampilan harus berisi 2–80 karakter.' }

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: normalizedName })
    .eq('id', userId)
    .select('id, display_name, avatar_url, role, created_at')
    .single()

  if (error || !data) return { error: error?.message ?? 'Profil gagal diperbarui.' }
  return { profile: mapProfile(data as Record<string, unknown>) }
}
