import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Edit3,
  Flag,
  Image,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BusinessClaimModerationPanel } from '../components/BusinessClaimModerationPanel'
import { ReviewModerationPanel } from '../components/ReviewModerationPanel'
import { ReportModerationPanel } from '../components/ReportModerationPanel'
import { useAuth } from '../context/AuthContext'
import {
  approveSubmission,
  archiveSubmission,
  fetchAdminWorkspace,
  rejectSubmission,
  restoreSubmission,
  saveSubmissionEdit,
  type SubmissionEditInput,
} from '../lib/moderation'
import { supabase } from '../lib/supabase'
import type { BusinessClaimAdminRecord } from '../lib/claims'
import type { ContentReportAdminRecord } from '../lib/reports'
import type { ReviewModerationRecord } from '../lib/reviews'
import {
  type PlaceSubmissionRecord,
  type SubmissionStatus,
} from '../lib/submissions'
import { dayLabels, dayOrder, type DayKey } from '../types/place'

type StatusFilter = 'all' | SubmissionStatus
type EditFormState = Omit<SubmissionEditInput, 'latitude' | 'longitude'> & {
  latitude: string
  longitude: string
}

const statusLabels: Record<SubmissionStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  archived: 'Diarsipkan',
}

const statusIcons: Record<SubmissionStatus, typeof ShieldCheck> = {
  pending: ShieldAlert,
  approved: CheckCircle2,
  rejected: XCircle,
  archived: Archive,
}

const categoryLabels: Record<PlaceSubmissionRecord['category'], string> = {
  makanan: 'Makanan',
  minuman: 'Minuman',
}

const priceLabels: Record<PlaceSubmissionRecord['priceRange'], string> = {
  murah: 'Di bawah 25K',
  sedang: '25K–60K',
  mahal: 'Di atas 60K',
  tidak_diketahui: 'Harga belum diketahui',
}

const halalLabels: Record<PlaceSubmissionRecord['halalStatus'], string> = {
  halal: 'Halal',
  non_halal: 'Non-halal',
  belum_terverifikasi: 'Belum terverifikasi',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function createEditForm(submission: PlaceSubmissionRecord): EditFormState {
  const hours = Object.fromEntries(dayOrder.map((day) => [day, {
    closed: true,
    open: '10:00',
    close: '22:00',
  }])) as Record<DayKey, SubmissionEditInput['hours'][DayKey]>

  for (const hour of submission.hours) {
    const day = dayOrder.find((_, index) => index === hour.dayOfWeek - 1) ?? (hour.dayOfWeek === 0 ? 'minggu' : undefined)
    if (!day) continue
    hours[day] = {
      closed: hour.isClosed,
      open: hour.openTime?.slice(0, 5) ?? '10:00',
      close: hour.closeTime?.slice(0, 5) ?? '22:00',
    }
  }

  return {
    name: submission.name,
    category: submission.category,
    priceRange: submission.priceRange,
    halalStatus: submission.halalStatus,
    description: submission.description ?? '',
    address: submission.address,
    area: submission.area ?? '',
    latitude: String(submission.latitude),
    longitude: String(submission.longitude),
    phone: submission.phone ?? '',
    websiteUrl: submission.websiteUrl ?? '',
    hours,
  }
}

function SubmissionStatusPill({ status }: { status: SubmissionStatus }) {
  const StatusIcon = statusIcons[status]
  return <span className={`admin-status admin-status--${status}`}><StatusIcon size={13} /> {statusLabels[status]}</span>
}

function SubmissionPhotos({ submission }: { submission: PlaceSubmissionRecord }) {
  const photoEntries = Object.entries(submission.photoUrls ?? {})
  if (photoEntries.length === 0) {
    return <div className="admin-submission-card__photo-placeholder"><Image size={23} /><span>{submission.photos.length > 0 ? 'Foto belum bisa dimuat' : 'Tanpa foto'}</span></div>
  }

  return (
    <div className="admin-submission-card__photos">
      {photoEntries.slice(0, 4).map(([photoId, url]) => <img key={photoId} src={url} alt={`Foto ${submission.name}`} />)}
    </div>
  )
}

function EditSubmissionForm({
  form,
  onChange,
  onHourChange,
  onCancel,
  onSubmit,
  isSaving,
}: {
  form: EditFormState
  onChange: <Key extends keyof EditFormState>(key: Key, value: EditFormState[Key]) => void
  onHourChange: (day: DayKey, key: 'closed' | 'open' | 'close', value: string | boolean) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isSaving: boolean
}) {
  return (
    <form className="admin-edit-form" onSubmit={onSubmit}>
      <div className="admin-edit-form__heading"><div><span className="section-kicker">EDIT USULAN</span><strong>Perbarui informasi tempat</strong></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Tutup editor"><X size={17} /></button></div>
      <div className="form-fields-grid">
        <div className="form-field form-field--wide"><label htmlFor="admin-edit-name">Nama tempat *</label><input id="admin-edit-name" value={form.name} onChange={(event) => onChange('name', event.target.value)} minLength={2} maxLength={120} required /></div>
        <div className="form-field"><label htmlFor="admin-edit-category">Kategori *</label><select id="admin-edit-category" value={form.category} onChange={(event) => onChange('category', event.target.value as EditFormState['category'])} required><option value="makanan">Makanan</option><option value="minuman">Minuman</option></select></div>
        <div className="form-field"><label htmlFor="admin-edit-price">Kisaran harga *</label><select id="admin-edit-price" value={form.priceRange} onChange={(event) => onChange('priceRange', event.target.value as EditFormState['priceRange'])} required><option value="murah">Di bawah 25K</option><option value="sedang">25K–60K</option><option value="mahal">Di atas 60K</option><option value="tidak_diketahui">Belum diketahui</option></select></div>
        <div className="form-field"><label htmlFor="admin-edit-halal">Label halal *</label><select id="admin-edit-halal" value={form.halalStatus} onChange={(event) => onChange('halalStatus', event.target.value as EditFormState['halalStatus'])} required><option value="halal">Halal</option><option value="non_halal">Non-halal</option><option value="belum_terverifikasi">Belum terverifikasi</option></select></div>
        <div className="form-field form-field--wide"><label htmlFor="admin-edit-description">Deskripsi</label><textarea id="admin-edit-description" value={form.description} onChange={(event) => onChange('description', event.target.value)} maxLength={2000} rows={3} /></div>
        <div className="form-field form-field--wide"><label htmlFor="admin-edit-address">Alamat *</label><input id="admin-edit-address" value={form.address} onChange={(event) => onChange('address', event.target.value)} minLength={5} maxLength={240} required /></div>
        <div className="form-field"><label htmlFor="admin-edit-area">Area</label><input id="admin-edit-area" value={form.area} onChange={(event) => onChange('area', event.target.value)} maxLength={120} /></div>
        <div className="form-field"><label htmlFor="admin-edit-phone">Telepon</label><input id="admin-edit-phone" value={form.phone} onChange={(event) => onChange('phone', event.target.value)} maxLength={40} /></div>
        <div className="form-field"><label htmlFor="admin-edit-latitude">Latitude *</label><input id="admin-edit-latitude" type="number" step="any" value={form.latitude} onChange={(event) => onChange('latitude', event.target.value)} required /></div>
        <div className="form-field"><label htmlFor="admin-edit-longitude">Longitude *</label><input id="admin-edit-longitude" type="number" step="any" value={form.longitude} onChange={(event) => onChange('longitude', event.target.value)} required /></div>
        <div className="form-field form-field--wide"><label htmlFor="admin-edit-website">Link usaha</label><input id="admin-edit-website" type="url" value={form.websiteUrl} onChange={(event) => onChange('websiteUrl', event.target.value)} /></div>
      </div>
      <div className="admin-edit-hours"><strong>Jam buka</strong>{dayOrder.map((day) => <div className="admin-edit-hour-row" key={day}><span>{dayLabels[day]}</span><label><input type="checkbox" checked={form.hours[day].closed} onChange={(event) => onHourChange(day, 'closed', event.target.checked)} /> Tutup</label><input type="time" value={form.hours[day].open} disabled={form.hours[day].closed} onChange={(event) => onHourChange(day, 'open', event.target.value)} required={!form.hours[day].closed} /><span>–</span><input type="time" value={form.hours[day].close} disabled={form.hours[day].closed} onChange={(event) => onHourChange(day, 'close', event.target.value)} required={!form.hours[day].closed} /></div>)}</div>
      <div className="admin-edit-form__footer"><span>Perubahan dicatat di riwayat moderasi.</span><div><button className="button button--secondary" type="button" onClick={onCancel}>Batal</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} Simpan perubahan</button></div></div>
    </form>
  )
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<string>()
  const [roleLoading, setRoleLoading] = useState(true)
  const [submissions, setSubmissions] = useState<PlaceSubmissionRecord[]>([])
  const [reviews, setReviews] = useState<ReviewModerationRecord[]>([])
  const [claims, setClaims] = useState<BusinessClaimAdminRecord[]>([])
  const [reports, setReports] = useState<ContentReportAdminRecord[]>([])
  const [stats, setStats] = useState<{ pendingSubmissions: number; pendingReviews: number; pendingClaims: number; pendingReports: number; approvedPlaces: number }>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string>()
  const [rejectingId, setRejectingId] = useState<string>()
  const [rejectReason, setRejectReason] = useState('')
  const [editing, setEditing] = useState<PlaceSubmissionRecord>()
  const [editForm, setEditForm] = useState<EditFormState>()

  useEffect(() => {
    let isMounted = true
    setRole(undefined)
    setRoleLoading(true)

    if (!user) {
      setRoleLoading(false)
      return () => { isMounted = false }
    }
    if (!supabase) {
      setError('Supabase belum dikonfigurasi. Periksa file .env.local.')
      setRoleLoading(false)
      return () => { isMounted = false }
    }

    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data, error: profileError }) => {
      if (!isMounted) return
      setRole((data?.role as string | undefined) ?? undefined)
      if (profileError) setError(profileError.message)
      setRoleLoading(false)
    })

    return () => { isMounted = false }
  }, [user?.id])

  async function loadWorkspace() {
    setIsLoading(true)
    setError(undefined)
    const result = await fetchAdminWorkspace()
    if (result.error) {
      setError(result.error)
      setSubmissions([])
      setReviews([])
      setClaims([])
      setReports([])
      setStats(undefined)
    } else {
      setSubmissions(result.submissions)
      setReviews(result.reviews)
      setClaims(result.claims)
      setReports(result.reports)
      setStats(result.stats)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (role === 'admin') void loadWorkspace()
  }, [role])

  const visibleSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return submissions.filter((submission) => {
      const matchesStatus = filter === 'all' || submission.status === filter
      const matchesQuery = !normalizedQuery || [submission.name, submission.address, submission.area ?? '', submission.contributorName ?? '', submission.submittedBy]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [filter, query, submissions])

  function startEdit(submission: PlaceSubmissionRecord) {
    setRejectingId(undefined)
    setEditing(submission)
    setEditForm(createEditForm(submission))
  }

  function updateEditField<Key extends keyof EditFormState>(key: Key, value: EditFormState[Key]) {
    setEditForm((current) => current ? { ...current, [key]: value } : current)
  }

  function updateEditHour(day: DayKey, key: 'closed' | 'open' | 'close', value: string | boolean) {
    setEditForm((current) => current ? {
      ...current,
      hours: { ...current.hours, [day]: { ...current.hours[day], [key]: value } },
    } : current)
  }

  async function runAction(submission: PlaceSubmissionRecord, action: (adminId: string, target: PlaceSubmissionRecord) => Promise<{ error?: string }>) {
    if (!user) return
    setBusyId(submission.id)
    setError(undefined)
    const result = await action(user.id, submission)
    setBusyId(undefined)
    if (result.error) {
      setError(result.error)
      return
    }
    setRejectingId(undefined)
    setRejectReason('')
    await loadWorkspace()
  }

  async function handleReject(submission: PlaceSubmissionRecord) {
    if (!user) return
    setBusyId(submission.id)
    setError(undefined)
    const result = await rejectSubmission(user.id, submission, rejectReason)
    setBusyId(undefined)
    if (result.error) {
      setError(result.error)
      return
    }
    setRejectingId(undefined)
    setRejectReason('')
    await loadWorkspace()
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !editing || !editForm) return
    const latitude = Number(editForm.latitude)
    const longitude = Number(editForm.longitude)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Latitude atau longitude tidak valid.')
      return
    }
    if (dayOrder.some((day) => !editForm.hours[day].closed && (!editForm.hours[day].open || !editForm.hours[day].close))) {
      setError('Lengkapi jam buka dan tutup pada hari yang aktif.')
      return
    }

    setBusyId(editing.id)
    setError(undefined)
    const result = await saveSubmissionEdit(user.id, editing, { ...editForm, latitude, longitude })
    setBusyId(undefined)
    if (result.error) {
      setError(result.error)
      return
    }
    setEditing(undefined)
    setEditForm(undefined)
    await loadWorkspace()
  }

  if (authLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memeriksa sesi login...</div>

  if (!user) {
    return (
      <div className="page-width centered-page admin-gate">
        <div className="centered-page__icon"><ShieldCheck size={24} /></div>
        <span className="section-kicker">Workspace admin</span>
        <h1>Masuk untuk membuka panel</h1>
        <p>Panel moderasi hanya dapat diakses oleh akun yang memiliki role admin di Supabase.</p>
        <div className="centered-page__actions"><Link className="button button--primary" to="/login?next=%2Fadmin">Masuk sebagai admin</Link><Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali ke halaman publik</Link></div>
      </div>
    )
  }

  if (roleLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memeriksa hak akses admin...</div>

  if (role !== 'admin') {
    return (
      <div className="page-width centered-page admin-restricted">
        <div className="centered-page__icon centered-page__icon--danger"><ShieldAlert size={24} /></div>
        <span className="section-kicker">Akses terbatas</span>
        <h1>Panel ini khusus untuk admin</h1>
        <p>Akun {user.email ?? 'aktif'} belum memiliki role admin. Minta admin utama mengatur role di tabel profiles.</p>
        <div className="centered-page__actions"><Link className="button button--secondary" to="/"><ArrowLeft size={15} /> Kembali ke halaman publik</Link></div>
      </div>
    )
  }

  return (
    <div className="page-width admin-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke halaman publik</Link>
      <div className="admin-page__heading admin-page__heading--workspace">
        <div><span className="section-kicker">Workspace admin</span><h1>Jaga kualitas setiap temuan</h1><p>Periksa data, foto, dan cerita komunitas sebelum masuk ke katalog Bandung.</p></div>
        <button className="button button--secondary" type="button" onClick={() => void loadWorkspace()} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'spin' : undefined} /> Segarkan</button>
      </div>

      {error && <div className="data-notice data-notice--error" role="alert">{error}</div>}

      <div className="admin-stat-grid">
        <div className="admin-stat"><ClipboardCheck size={18} /><span>Usulan menunggu</span><strong>{String(stats?.pendingSubmissions ?? 0).padStart(2, '0')}</strong></div>
        <div className="admin-stat"><ShieldCheck size={18} /><span>Ulasan ditinjau</span><strong>{String(stats?.pendingReviews ?? 0).padStart(2, '0')}</strong></div>
        <div className="admin-stat"><BriefcaseBusiness size={18} /><span>Klaim menunggu</span><strong>{String(stats?.pendingClaims ?? 0).padStart(2, '0')}</strong></div>
        <div className="admin-stat"><Flag size={18} /><span>Laporan menunggu</span><strong>{String(stats?.pendingReports ?? 0).padStart(2, '0')}</strong></div>
        <div className="admin-stat"><Database size={18} /><span>Tempat aktif</span><strong>{String(stats?.approvedPlaces ?? 0).padStart(2, '0')}</strong></div>
      </div>

      <nav className="admin-section-nav" aria-label="Navigasi workspace admin">
        <a href="#moderasi-usulan"><ClipboardCheck size={16} /> Usulan tempat</a>
        <a href="#moderasi-ulasan"><ShieldCheck size={16} /> Ulasan</a>
        <a href="#klaim-bisnis"><BriefcaseBusiness size={16} /> Klaim bisnis</a>
        <a href="#laporan-konten"><Flag size={16} /> Laporan</a>
      </nav>

      <section className="admin-workspace" id="moderasi-usulan" aria-label="Daftar usulan tempat">
        <div className="admin-workspace__toolbar">
          <div><span className="section-kicker">Moderasi kontribusi</span><h2>Daftar usulan</h2></div>
          <label className="admin-search"><Search size={16} /><span className="sr-only">Cari usulan</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, area, atau kontributor" /></label>
        </div>
        <div className="admin-filter-tabs" role="tablist" aria-label="Filter status usulan">
          {(['pending', 'all', 'rejected', 'approved', 'archived'] as StatusFilter[]).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} type="button" onClick={() => setFilter(item)}>{item === 'all' ? 'Semua' : statusLabels[item]}</button>)}
        </div>

        {isLoading ? (
          <div className="admin-empty"><LoaderCircle size={22} className="spin" /><h2>Memuat usulan...</h2><p>Mengambil data terbaru dari Supabase.</p></div>
        ) : visibleSubmissions.length === 0 ? (
          <div className="admin-empty"><ShieldCheck size={22} /><h2>Tidak ada usulan di sini</h2><p>Coba pilih status lain atau ubah kata kunci pencarian.</p></div>
        ) : (
          <div className="admin-submission-list">
            {visibleSubmissions.map((submission) => {
              const isBusy = busyId === submission.id
              return (
                <article className="admin-submission-card" key={submission.id}>
                  <div className="admin-submission-card__topline"><SubmissionStatusPill status={submission.status} /><span>Dikirim {formatDate(submission.createdAt)}</span></div>
                  <div className="admin-submission-card__body">
                    <SubmissionPhotos submission={submission} />
                    <div className="admin-submission-card__copy"><div className="admin-submission-card__title-row"><div><span className="section-kicker">{categoryLabels[submission.category]}</span><h3>{submission.name}</h3></div><span className="admin-submission-card__id">#{submission.id.slice(0, 8)}</span></div><p className="admin-submission-card__address"><MapPin size={14} /> {submission.address}{submission.area ? ` · ${submission.area}` : ''}</p><div className="admin-submission-card__meta"><span>{priceLabels[submission.priceRange]}</span><span>{halalLabels[submission.halalStatus]}</span></div>{submission.description && <p className="admin-submission-card__description">{submission.description}</p>}<div className="admin-submission-card__contributor"><UserRound size={14} /><span>Kontributor</span><strong>{submission.contributorName || 'Nama belum tersedia'}</strong><small>{submission.submittedBy}</small></div></div>
                  </div>
                  {submission.status === 'rejected' && submission.rejectionReason && <div className="admin-rejection-note"><XCircle size={15} /><div><strong>Alasan penolakan</strong><span>{submission.rejectionReason}</span></div></div>}
                  {rejectingId === submission.id && <div className="admin-reject-form"><label htmlFor={`reject-reason-${submission.id}`}>Alasan penolakan *</label><textarea id={`reject-reason-${submission.id}`} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Jelaskan bagian yang perlu diperbaiki oleh kontributor..." maxLength={500} rows={3} /><div><button className="button button--secondary" type="button" onClick={() => { setRejectingId(undefined); setRejectReason('') }}>Batal</button><button className="button button--danger" type="button" onClick={() => void handleReject(submission)} disabled={isBusy}>{isBusy ? <LoaderCircle size={15} className="spin" /> : <XCircle size={15} />} Tolak usulan</button></div></div>}
                  {editing?.id === submission.id && editForm && <EditSubmissionForm form={editForm} onChange={updateEditField} onHourChange={updateEditHour} onCancel={() => { setEditing(undefined); setEditForm(undefined) }} onSubmit={(event) => void handleSaveEdit(event)} isSaving={isBusy} />}
                  {!editing || editing.id !== submission.id ? <div className="admin-submission-card__actions">
                    {(submission.status === 'pending' || submission.status === 'rejected') && <button className="button button--primary" type="button" onClick={() => void runAction(submission, approveSubmission)} disabled={isBusy}><Check size={15} /> Setujui</button>}
                    {submission.status !== 'archived' && <button className="button button--secondary" type="button" onClick={() => startEdit(submission)} disabled={isBusy}><Edit3 size={15} /> Edit</button>}
                    {submission.status !== 'approved' && submission.status !== 'archived' && <button className="button button--danger-ghost" type="button" onClick={() => { setEditing(undefined); setRejectingId(rejectingId === submission.id ? undefined : submission.id); setRejectReason('') }} disabled={isBusy}><XCircle size={15} /> Tolak</button>}
                    {submission.status === 'archived' ? <button className="button button--secondary" type="button" onClick={() => void runAction(submission, restoreSubmission)} disabled={isBusy}><RefreshCw size={15} /> Pulihkan</button> : <button className="button button--ghost" type="button" onClick={() => void runAction(submission, archiveSubmission)} disabled={isBusy}><Archive size={15} /> Arsipkan</button>}
                  </div> : null}
                </article>
              )
            })}
          </div>
        )}
      </section>
      <ReviewModerationPanel reviews={reviews} isLoading={isLoading} onRefresh={loadWorkspace} onError={setError} />
      <BusinessClaimModerationPanel claims={claims} isLoading={isLoading} onRefresh={loadWorkspace} onError={setError} />
      <ReportModerationPanel reports={reports} isLoading={isLoading} onRefresh={loadWorkspace} onError={setError} />
    </div>
  )
}
