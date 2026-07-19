import { BriefcaseBusiness, Check, CheckCircle2, ExternalLink, FileText, LoaderCircle, Search, ShieldAlert, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { approveClaim, rejectClaim, type ModerationResult } from '../lib/moderation'
import type { BusinessClaimAdminRecord, ClaimStatus } from '../lib/claims'

type ClaimFilter = 'all' | ClaimStatus

type BusinessClaimModerationPanelProps = {
  claims: BusinessClaimAdminRecord[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  onError: (error?: string) => void
}

const statusLabels: Record<ClaimStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

const statusIcons: Record<ClaimStatus, typeof ShieldAlert> = {
  pending: ShieldAlert,
  approved: CheckCircle2,
  rejected: XCircle,
}

function ClaimStatusPill({ status }: { status: ClaimStatus }) {
  const StatusIcon = statusIcons[status]
  return <span className={`admin-status admin-status--${status}`}><StatusIcon size={13} /> {statusLabels[status]}</span>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function BusinessClaimModerationPanel({ claims, isLoading, onRefresh, onError }: BusinessClaimModerationPanelProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<ClaimFilter>('pending')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string>()
  const [rejectingId, setRejectingId] = useState<string>()
  const [rejectReason, setRejectReason] = useState('')

  const visibleClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return claims.filter((claim) => {
      const matchesStatus = filter === 'all' || claim.status === filter
      const matchesQuery = !normalizedQuery || [claim.placeName, claim.contactName, claim.contactPhone, claim.contactEmail ?? '', claim.claimantName ?? '', claim.claimantId]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [claims, filter, query])

  async function runAction(claim: BusinessClaimAdminRecord, action: (adminId: string, claim: BusinessClaimAdminRecord) => Promise<ModerationResult>) {
    if (!user) return
    setBusyId(claim.id)
    onError(undefined)
    const result = await action(user.id, claim)
    setBusyId(undefined)
    if (result.error) {
      onError(result.error)
      return
    }
    setRejectingId(undefined)
    setRejectReason('')
    await onRefresh()
  }

  async function handleReject(claim: BusinessClaimAdminRecord) {
    if (!user) return
    setBusyId(claim.id)
    onError(undefined)
    const result = await rejectClaim(user.id, claim, rejectReason)
    setBusyId(undefined)
    if (result.error) {
      onError(result.error)
      return
    }
    setRejectingId(undefined)
    setRejectReason('')
    await onRefresh()
  }

  return (
    <section className="admin-workspace admin-claim-workspace" id="klaim-bisnis" aria-label="Daftar klaim bisnis">
      <div className="admin-workspace__toolbar">
        <div><span className="section-kicker">Verifikasi pemilik</span><h2>Klaim bisnis</h2></div>
        <label className="admin-search"><Search size={16} /><span className="sr-only">Cari klaim</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tempat, nama, atau kontak" /></label>
      </div>
      <div className="admin-filter-tabs" role="tablist" aria-label="Filter status klaim bisnis">
        {(['pending', 'all', 'rejected', 'approved'] as ClaimFilter[]).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} type="button" onClick={() => setFilter(item)}>{item === 'all' ? 'Semua' : statusLabels[item]}</button>)}
      </div>

      {isLoading ? (
        <div className="admin-empty"><LoaderCircle size={22} className="spin" /><h2>Memuat klaim...</h2><p>Mengambil pengajuan kepemilikan terbaru.</p></div>
      ) : visibleClaims.length === 0 ? (
        <div className="admin-empty"><BriefcaseBusiness size={22} /><h2>Tidak ada klaim di sini</h2><p>Coba pilih status lain atau ubah kata kunci pencarian.</p></div>
      ) : (
        <div className="admin-claim-list">
          {visibleClaims.map((claim) => {
            const isBusy = busyId === claim.id
            return (
              <article className="admin-claim-card" key={claim.id}>
                <div className="admin-submission-card__topline"><ClaimStatusPill status={claim.status} /><span>Diajukan {formatDate(claim.createdAt)}</span></div>
                <div className="admin-claim-card__body">
                  <div className="admin-claim-card__heading"><div><span className="section-kicker">Tempat</span><h3>{claim.placeName}</h3></div><span className="admin-submission-card__id">#{claim.id.slice(0, 8)}</span></div>
                  <div className="admin-claim-card__grid">
                    <div><span>Penanggung jawab</span><strong>{claim.contactName}</strong></div>
                    <div><span>Nomor kontak</span><strong>{claim.contactPhone}</strong></div>
                    <div><span>Email</span><strong>{claim.contactEmail || 'Tidak diisi'}</strong></div>
                    <div><span>Pengaju</span><strong>{claim.claimantName || 'Nama belum tersedia'}</strong><small>{claim.claimantId}</small></div>
                  </div>
                  {claim.notes && <p className="admin-claim-card__notes">{claim.notes}</p>}
                  <div className="admin-claim-card__proof"><FileText size={16} /><div><span>Bukti kepemilikan</span><strong>{claim.proofStoragePath.split('/').pop()}</strong></div>{claim.proofUrl ? <a className="button button--secondary" href={claim.proofUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Buka bukti</a> : <small>Preview tidak tersedia</small>}</div>
                </div>
                {claim.status === 'rejected' && claim.rejectionReason && <div className="admin-rejection-note"><XCircle size={15} /><div><strong>Alasan penolakan</strong><span>{claim.rejectionReason}</span></div></div>}
                {rejectingId === claim.id && <div className="admin-reject-form"><label htmlFor={`claim-reject-reason-${claim.id}`}>Alasan penolakan *</label><textarea id={`claim-reject-reason-${claim.id}`} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Jelaskan dokumen atau informasi yang perlu diperbaiki..." maxLength={500} rows={3} /><div><button className="button button--secondary" type="button" onClick={() => { setRejectingId(undefined); setRejectReason('') }}>Batal</button><button className="button button--danger" type="button" onClick={() => void handleReject(claim)} disabled={isBusy}>{isBusy ? <LoaderCircle size={15} className="spin" /> : <XCircle size={15} />} Tolak klaim</button></div></div>}
                <div className="admin-submission-card__actions">
                  {(claim.status === 'pending' || claim.status === 'rejected') && <button className="button button--primary" type="button" onClick={() => void runAction(claim, approveClaim)} disabled={isBusy}><Check size={15} /> Setujui</button>}
                  {claim.status === 'pending' && <button className="button button--danger-ghost" type="button" onClick={() => { setRejectingId(rejectingId === claim.id ? undefined : claim.id); setRejectReason('') }} disabled={isBusy}><XCircle size={15} /> Tolak</button>}
                </div>
                {claim.status === 'approved' && <div className="admin-claim-card__approved"><CheckCircle2 size={15} /> Pemilik terverifikasi · role owner dibuat otomatis</div>}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
