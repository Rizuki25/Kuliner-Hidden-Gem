import { LoaderCircle, MessageCircle, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteReview, fetchPlaceReviews, saveReview, type ReviewRecord } from '../lib/reviews'
import { ReportContentButton } from './ReportContentButton'
import { ReviewStars } from './ReviewStars'

type ReviewsSectionProps = {
  placeId: string
  onChanged?: () => void
}

const reviewStatusLabels: Record<ReviewRecord['status'], string> = {
  pending: 'Menunggu persetujuan admin',
  approved: 'Tampil di publik',
  rejected: 'Perlu diperbaiki',
  archived: 'Diarsipkan',
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function ReviewStatusNote({ review }: { review: ReviewRecord }) {
  const isRejected = review.status === 'rejected'
  return (
    <div className={`review-status-note${isRejected ? ' review-status-note--error' : ''}`} role="status">
      <strong>{reviewStatusLabels[review.status]}</strong>
      {isRejected && review.moderationReason ? <span>{review.moderationReason}</span> : <span>{review.status === 'approved' ? 'Terima kasih sudah berbagi pengalaman.' : 'Perubahan akan terlihat setelah ditinjau.'}</span>}
    </div>
  )
}

export function ReviewsSection({ placeId, onChanged }: ReviewsSectionProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [ownReview, setOwnReview] = useState<ReviewRecord>()
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  async function loadReviews() {
    setIsLoading(true)
    const result = await fetchPlaceReviews(placeId, user?.id)
    setReviews(result.reviews)
    setOwnReview(result.ownReview)
    setRating(result.ownReview?.rating ?? 0)
    setBody(result.ownReview?.body ?? '')
    setError(result.error)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadReviews()
  }, [placeId, user?.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/tempat/${placeId}#ulasan-komunitas`)}`)
      return
    }

    setIsSaving(true)
    setError(undefined)
    setNotice(undefined)
    const result = await saveReview(user.id, placeId, { rating, body }, ownReview)
    if (result.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    setNotice(ownReview ? 'Ulasan berhasil diperbarui dan masuk antrean moderasi.' : 'Ulasan berhasil dikirim dan masuk antrean moderasi.')
    await loadReviews()
    onChanged?.()
    setIsSaving(false)
  }

  async function handleDelete() {
    if (!user || !ownReview) return
    if (!window.confirm('Hapus ulasan ini? Tindakan ini tidak dapat dibatalkan.')) return

    setIsSaving(true)
    setError(undefined)
    setNotice(undefined)
    const result = await deleteReview(user.id, ownReview.id)
    if (result.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    setNotice('Ulasan berhasil dihapus.')
    await loadReviews()
    onChanged?.()
    setIsSaving(false)
  }

  return (
    <section className="detail-card reviews-section" id="ulasan-komunitas">
      <div className="detail-card__heading"><span className="section-kicker">ULASAN KOMUNITAS</span><h2>Cerita dari pengunjung</h2></div>

      <div className="review-composer">
        {!user ? (
          <div className="review-login-prompt">
            <MessageCircle size={19} />
            <div><strong>Punya pengalaman di sini?</strong><span>Masuk untuk memberi rating dan berbagi cerita.</span></div>
            <Link className="button button--secondary" to={`/login?next=${encodeURIComponent(`/tempat/${placeId}#ulasan-komunitas`)}`}>Masuk untuk mengulas</Link>
          </div>
        ) : (
          <form className="review-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="review-form__heading"><div><strong>{ownReview ? 'Perbarui ulasanmu' : 'Bagikan pengalamanmu'}</strong><span>Rating dan ulasan akan ditinjau admin sebelum tampil publik.</span></div>{ownReview && <ReviewStatusNote review={ownReview} />}</div>
            <div className="review-form__rating"><span>Rating kamu</span><ReviewStars value={rating} interactive onChange={setRating} /></div>
            <label className="sr-only" htmlFor="review-body">Ulasan</label>
            <textarea id="review-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Apa yang kamu pesan? Bagaimana rasanya?" minLength={3} maxLength={2000} rows={4} required />
            {error && <div className="data-notice data-notice--error review-form__message" role="alert">{error}</div>}
            {notice && <div className="data-notice review-form__message" role="status">{notice}</div>}
            <div className="review-form__footer"><span>{body.length}/2000 karakter</span><div>{ownReview && <button className="button button--danger-ghost" type="button" onClick={() => void handleDelete()} disabled={isSaving}><Trash2 size={14} /> Hapus</button>}<button className="button button--primary" type="submit" disabled={isSaving || rating === 0}>{isSaving ? <LoaderCircle size={15} className="spin" /> : null}{ownReview ? 'Simpan perubahan' : 'Kirim ulasan'}</button></div></div>
          </form>
        )}
      </div>

      {isLoading ? (
        <div className="reviews-loading"><LoaderCircle size={17} className="spin" /> Memuat ulasan...</div>
      ) : error && reviews.length === 0 && !user ? (
        <div className="data-notice data-notice--error reviews-error" role="alert">Ulasan gagal dimuat: {error}</div>
      ) : reviews.length === 0 ? (
        <div className="review-empty"><MessageCircle size={18} /><span>Belum ada ulasan publik. Jadilah yang pertama berbagi pengalaman.</span></div>
      ) : (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-item" key={review.id}>
              <div className="review-item__topline"><div><strong>{review.authorName || 'Pengunjung Bandung'}</strong><span>{formatReviewDate(review.createdAt)}</span></div><ReviewStars value={review.rating} size={14} /></div>
              <p>{review.body}</p>
              <div className="review-item__footer"><ReportContentButton entityType="review" entityId={review.id} entityLabel="ulasan" /></div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
