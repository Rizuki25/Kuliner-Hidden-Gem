import { Archive, ArrowLeft, CheckCircle2, Clock3, History, Image, LoaderCircle, Plus, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { attachSubmissionPhotoUrls, fetchUserSubmissions, type PlaceSubmissionRecord, type SubmissionStatus } from '../lib/submissions'

const statusLabels: Record<SubmissionStatus, string> = {
  pending: 'Menunggu ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  archived: 'Diarsipkan',
}

const statusIcons: Record<SubmissionStatus, typeof Clock3> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  archived: Archive,
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
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function SubmissionCard({ submission }: { submission: PlaceSubmissionRecord }) {
  const StatusIcon = statusIcons[submission.status]
  const photoEntries = Object.entries(submission.photoUrls ?? {})

  return (
    <article className="contribution-card">
      <div className="contribution-card__topline">
        <span className={`contribution-status contribution-status--${submission.status}`}><StatusIcon size={14} /> {statusLabels[submission.status]}</span>
        <span className="contribution-card__date">Dikirim {formatDate(submission.createdAt)}</span>
      </div>
      <div className="contribution-card__body">
        {photoEntries.length > 0 ? (
          <div className="contribution-card__photos">
            {photoEntries.slice(0, 3).map(([photoId, url]) => <img key={photoId} src={url} alt={`Foto ${submission.name}`} />)}
          </div>
        ) : (
          <div className="contribution-card__photo-placeholder"><Image size={22} /><span>Belum ada foto</span></div>
        )}
        <div className="contribution-card__copy">
          <div className="contribution-card__title-row">
            <div><span className="section-kicker">{submission.category === 'makanan' ? 'MAKANAN' : 'MINUMAN'}</span><h2>{submission.name}</h2></div>
            <span className="contribution-card__id">#{submission.id.slice(0, 8)}</span>
          </div>
          <p>{submission.address}{submission.area ? ` · ${submission.area}` : ''}</p>
          <div className="contribution-card__meta"><span>{priceLabels[submission.priceRange]}</span><span>{halalLabels[submission.halalStatus]}</span></div>
          {submission.description && <p className="contribution-card__description">{submission.description}</p>}
          {submission.status === 'rejected' && submission.rejectionReason && <div className="contribution-card__reason"><strong>Catatan admin</strong><span>{submission.rejectionReason}</span></div>}
          {submission.status === 'approved' && <div className="contribution-card__approved-note"><CheckCircle2 size={15} /> Tempat sudah masuk ke katalog publik.</div>}
        </div>
      </div>
    </article>
  )
}

export function ContributionHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [submissions, setSubmissions] = useState<PlaceSubmissionRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function loadSubmissions() {
    if (!user) return
    setIsLoading(true)
    setError(undefined)
    const result = await fetchUserSubmissions(user.id)
    if (result.error) {
      setSubmissions([])
      setError(result.error)
    } else {
      setSubmissions(await attachSubmissionPhotoUrls(result.submissions))
    }
    setIsLoading(false)
  }

  useEffect(() => {
    void loadSubmissions()
  }, [user?.id])

  if (authLoading) {
    return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memeriksa sesi login...</div>
  }

  if (!user) {
    return (
      <div className="page-width centered-page">
        <div className="centered-page__icon"><History size={24} /></div>
        <span className="section-kicker">RIWAYAT KONTRIBUSI</span>
        <h1>Semua temuanmu<br /><em>tersimpan di sini.</em></h1>
        <p>Masuk terlebih dahulu untuk melihat status usulan tempat yang pernah kamu kirim.</p>
        <div className="centered-page__actions">
          <Link className="button button--primary" to="/login?next=%2Fkontribusi">Masuk untuk melihat</Link>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali menjelajah</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-width contribution-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link>
      <div className="contribution-page__heading">
        <div>
          <span className="section-kicker">RUANG KONTRIBUSI</span>
          <h1>Jejak temuan<br /><em>yang kamu bagikan.</em></h1>
          <p>Pantau proses pemeriksaan setiap usulan tempat dari satu ruang.</p>
        </div>
        <Link className="button button--primary" to="/usulkan-tempat"><Plus size={16} /> Usulkan tempat</Link>
      </div>

      {error && <div className="data-notice data-notice--error" role="alert">{error}</div>}
      {isLoading ? (
        <div className="loading-state contribution-loading"><LoaderCircle size={17} className="spin" /> Memuat riwayat kontribusi...</div>
      ) : submissions.length > 0 ? (
        <div className="contribution-list">{submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)}</div>
      ) : (
        <div className="contribution-empty">
          <History size={24} />
          <h2>Belum ada usulan tempat</h2>
          <p>Temukan hidden gem di sekitar Bandung dan bantu orang lain menemukannya juga.</p>
          <Link className="button button--secondary" to="/usulkan-tempat"><Plus size={16} /> Buat usulan pertama</Link>
        </div>
      )}

      {error && <button className="button button--secondary contribution-retry" type="button" onClick={() => void loadSubmissions()} disabled={isLoading}>Coba lagi</button>}
    </div>
  )
}
