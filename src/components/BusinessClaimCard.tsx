import { BriefcaseBusiness, FileCheck2, Link as LinkIcon, LoaderCircle, ShieldCheck, Upload } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BUSINESS_CLAIM_PROOF_TYPES,
  fetchPlaceClaim,
  submitBusinessClaim,
  type BusinessClaimInput,
  type BusinessClaimRecord,
} from '../lib/claims'

type BusinessClaimCardProps = {
  placeId: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ClaimStatus({ claim }: { claim: BusinessClaimRecord }) {
  if (claim.status === 'approved') {
    return <div className="business-claim-card__status business-claim-card__status--approved"><ShieldCheck size={19} /><div><strong>Klaim disetujui</strong><span>Admin sudah memverifikasi pengajuan ini pada {formatDate(claim.reviewedAt ?? claim.updatedAt)}.</span></div></div>
  }

  if (claim.status === 'pending') {
    return <div className="business-claim-card__status business-claim-card__status--pending"><FileCheck2 size={19} /><div><strong>Menunggu verifikasi admin</strong><span>Pengajuan dikirim {formatDate(claim.createdAt)}. Kamu dapat mengirim pengajuan baru setelah pengajuan ini selesai ditinjau.</span></div></div>
  }

  return <div className="business-claim-card__status business-claim-card__status--rejected"><BriefcaseBusiness size={19} /><div><strong>Pengajuan belum disetujui</strong><span>{claim.rejectionReason || 'Admin meminta pengajuan ini diperbaiki.'}</span></div></div>
}

export function BusinessClaimCard({ placeId }: BusinessClaimCardProps) {
  const { user } = useAuth()
  const [claim, setClaim] = useState<BusinessClaimRecord>()
  const [isManager, setIsManager] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email ?? '')
  const [notes, setNotes] = useState('')
  const [proof, setProof] = useState<File>()

  async function loadClaim() {
    if (!user) {
      setClaim(undefined)
      setIsManager(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const result = await fetchPlaceClaim(placeId, user.id)
    setClaim(result.claim)
    setIsManager(result.isManager)
    setError(result.error)
    setIsLoading(false)
  }

  useEffect(() => {
    setContactEmail(user?.email ?? '')
    void loadClaim()
  }, [placeId, user?.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    if (!proof) {
      setError('Pilih satu file bukti kepemilikan terlebih dahulu.')
      return
    }

    setIsSaving(true)
    setError(undefined)
    setNotice(undefined)
    const input: BusinessClaimInput = { contactName, contactPhone, contactEmail, notes }
    const result = await submitBusinessClaim(user.id, placeId, input, proof)
    if (result.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    setNotice('Pengajuan klaim berhasil dikirim dan menunggu verifikasi admin.')
    setContactName('')
    setContactPhone('')
    setNotes('')
    setProof(undefined)
    await loadClaim()
    setIsSaving(false)
  }

  if (!user) {
    return (
      <section className="detail-card business-claim-card">
        <div className="detail-card__heading"><span className="section-kicker">UNTUK PEMILIK USAHA</span><h2>Kelola tempat ini</h2></div>
        <div className="business-claim-card__login"><BriefcaseBusiness size={19} /><div><strong>Pemilik atau pengelola tempat ini?</strong><span>Masuk untuk mengajukan verifikasi kepemilikan kepada admin.</span></div><Link className="button button--secondary" to={`/login?next=${encodeURIComponent(`/tempat/${placeId}`)}`}>Masuk</Link></div>
      </section>
    )
  }

  if (isLoading) {
    return <section className="detail-card business-claim-card"><div className="business-claim-card__loading"><LoaderCircle size={17} className="spin" /> Memeriksa status klaim...</div></section>
  }

  return (
    <section className="detail-card business-claim-card">
      <div className="detail-card__heading"><span className="section-kicker">UNTUK PEMILIK USAHA</span><h2>Kelola tempat ini</h2></div>

      {isManager ? (
        <div className="business-claim-card__status business-claim-card__status--approved"><ShieldCheck size={19} /><div><strong>Akunmu sudah terverifikasi</strong><span>Kamu dapat memperbarui informasi, jam buka, dan foto tempat ini.</span></div><Link className="button button--primary" to={`/kelola-tempat?place=${placeId}`}>Kelola tempat</Link></div>
      ) : claim ? <ClaimStatus claim={claim} /> : null}

      {error && <div className="data-notice data-notice--error business-claim-card__message" role="alert">{error}</div>}
      {notice && <div className="data-notice business-claim-card__message" role="status">{notice}</div>}

      {!isManager && claim?.status !== 'pending' && claim?.status !== 'approved' && (
        <form className="business-claim-card__form" onSubmit={(event) => void handleSubmit(event)}>
          <p className="business-claim-card__intro">Kirim data kontak dan satu dokumen pendukung agar admin dapat memverifikasi hubunganmu dengan tempat ini.</p>
          <div className="business-claim-card__fields">
            <label><span>Nama pemilik / penanggung jawab *</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} required /></label>
            <label><span>Nomor kontak *</span><input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={40} inputMode="tel" required /></label>
            <label className="business-claim-card__field--wide"><span>Email kontak</span><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={160} /></label>
            <label className="business-claim-card__field--wide"><span>Catatan tambahan</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} placeholder="Contoh: saya mengelola tempat ini sejak tahun..." /></label>
          </div>
          <label className="business-claim-card__file"><Upload size={17} /><span><strong>{proof ? proof.name : 'Pilih bukti kepemilikan'}</strong><small>PDF, JPG, PNG, WebP · maksimal 10 MB</small></span><input type="file" accept={BUSINESS_CLAIM_PROOF_TYPES.join(',')} onChange={(event) => setProof(event.target.files?.[0])} required /></label>
          <div className="business-claim-card__footer"><span>Data hanya dapat dilihat oleh kamu dan admin.</span><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={15} className="spin" /> : <FileCheck2 size={15} />} Ajukan klaim</button></div>
        </form>
      )}

      {claim?.status === 'approved' && !isManager && <div className="business-claim-card__notice"><LinkIcon size={15} /> Klaim sudah disetujui, tetapi status pengelola belum terbaca. Segarkan halaman atau hubungi admin.</div>}
    </section>
  )
}
