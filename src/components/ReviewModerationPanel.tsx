import { Archive, Check, CheckCircle2, LoaderCircle, MessageCircle, RefreshCw, ShieldAlert, Star, UserRound, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  approveReview,
  archiveReview,
  rejectReview,
  restoreReview,
  type ModerationResult,
} from '../lib/moderation'
import type { ReviewModerationRecord, ReviewStatus } from '../lib/reviews'

type ReviewFilter = 'all' | ReviewStatus

type ReviewModerationPanelProps = {
  reviews: ReviewModerationRecord[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  onError: (error?: string) => void
}

const statusLabels: Record<ReviewStatus, string> = {
  pending: 'Menunggu',
  approved: 'Tampil publik',
  rejected: 'Ditolak',
  archived: 'Diarsipkan',
}

const statusIcons: Record<ReviewStatus, typeof ShieldAlert> = {
  pending: ShieldAlert,
  approved: CheckCircle2,
  rejected: XCircle,
  archived: Archive,
}

function ReviewStatusPill({ status }: { status: ReviewStatus }) {
  const StatusIcon = statusIcons[status]
  return <span className={`admin-status admin-status--${status}`}><StatusIcon size={13} /> {statusLabels[status]}</span>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ReviewRating({ rating }: { rating: number }) {
  return <span className="admin-review-card__rating" aria-label={`Rating ${rating} dari 5`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= rating ? 'currentColor' : 'none'} />)}</span>
}

export function ReviewModerationPanel({ reviews, isLoading, onRefresh, onError }: ReviewModerationPanelProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<ReviewFilter>('pending')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string>()
  const [rejectingId, setRejectingId] = useState<string>()
  const [rejectReason, setRejectReason] = useState('')

  const visibleReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return reviews.filter((review) => {
      const matchesStatus = filter === 'all' || review.status === filter
      const matchesQuery = !normalizedQuery || [review.placeName, review.body, review.contributorName ?? '', review.userId]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [filter, query, reviews])

  async function runAction(review: ReviewModerationRecord, action: (adminId: string, review: ReviewModerationRecord) => Promise<ModerationResult>) {
    if (!user) return
    setBusyId(review.id)
    onError(undefined)
    const result = await action(user.id, review)
    setBusyId(undefined)
    if (result.error) {
      onError(result.error)
      return
    }
    setRejectingId(undefined)
    setRejectReason('')
    await onRefresh()
  }

  async function handleReject(review: ReviewModerationRecord) {
    if (!user) return
    setBusyId(review.id)
    onError(undefined)
    const result = await rejectReview(user.id, review, rejectReason)
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
    <section className="admin-workspace admin-review-workspace" id="moderasi-ulasan" aria-label="Daftar ulasan komunitas">
      <div className="admin-workspace__toolbar">
        <div><span className="section-kicker">Moderasi ulasan</span><h2>Ulasan komunitas</h2></div>
        <label className="admin-search"><MessageCircle size={16} /><span className="sr-only">Cari ulasan</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tempat, isi, atau user" /></label>
      </div>
      <div className="admin-filter-tabs" role="tablist" aria-label="Filter status ulasan">
        {(['pending', 'all', 'rejected', 'approved', 'archived'] as ReviewFilter[]).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} type="button" onClick={() => setFilter(item)}>{item === 'all' ? 'Semua' : statusLabels[item]}</button>)}
      </div>

      {isLoading ? (
        <div className="admin-empty"><LoaderCircle size={22} className="spin" /><h2>Memuat ulasan...</h2><p>Mengambil ulasan terbaru dari Supabase.</p></div>
      ) : visibleReviews.length === 0 ? (
        <div className="admin-empty"><MessageCircle size={22} /><h2>Tidak ada ulasan di sini</h2><p>Coba pilih status lain atau ubah kata kunci pencarian.</p></div>
      ) : (
        <div className="admin-review-list">
          {visibleReviews.map((review) => {
            const isBusy = busyId === review.id
            return (
              <article className="admin-review-card" key={review.id}>
                <div className="admin-review-card__topline"><ReviewStatusPill status={review.status} /><span>Dikirim {formatDate(review.createdAt)}</span></div>
                <div className="admin-review-card__body">
                  <div className="admin-review-card__heading"><div><span className="section-kicker">Tempat</span><h3>{review.placeName}</h3></div><ReviewRating rating={review.rating} /></div>
                  <p className="admin-review-card__text">{review.body}</p>
                  <div className="admin-review-card__contributor"><UserRound size={14} /><span>Penulis</span><strong>{review.contributorName || 'Nama belum tersedia'}</strong><small>{review.userId}</small></div>
                </div>
                {review.status === 'rejected' && review.moderationReason && <div className="admin-rejection-note"><XCircle size={15} /><div><strong>Alasan penolakan</strong><span>{review.moderationReason}</span></div></div>}
                {rejectingId === review.id && <div className="admin-reject-form"><label htmlFor={`review-reject-reason-${review.id}`}>Alasan penolakan *</label><textarea id={`review-reject-reason-${review.id}`} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Jelaskan alasan ulasan disembunyikan..." maxLength={500} rows={3} /><div><button className="button button--secondary" type="button" onClick={() => { setRejectingId(undefined); setRejectReason('') }}>Batal</button><button className="button button--danger" type="button" onClick={() => void handleReject(review)} disabled={isBusy}>{isBusy ? <LoaderCircle size={15} className="spin" /> : <XCircle size={15} />} Tolak ulasan</button></div></div>}
                <div className="admin-submission-card__actions">
                  {(review.status === 'pending' || review.status === 'rejected') && <button className="button button--primary" type="button" onClick={() => void runAction(review, approveReview)} disabled={isBusy}><Check size={15} /> Setujui</button>}
                  {review.status !== 'archived' && <button className="button button--danger-ghost" type="button" onClick={() => { setRejectingId(rejectingId === review.id ? undefined : review.id); setRejectReason('') }} disabled={isBusy}><XCircle size={15} /> {review.status === 'approved' ? 'Sembunyikan' : 'Tolak'}</button>}
                  {review.status === 'archived' ? <button className="button button--secondary" type="button" onClick={() => void runAction(review, restoreReview)} disabled={isBusy}><RefreshCw size={15} /> Pulihkan</button> : <button className="button button--ghost" type="button" onClick={() => void runAction(review, archiveReview)} disabled={isBusy}><Archive size={15} /> Arsipkan</button>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
