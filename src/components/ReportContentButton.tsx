import { Flag, LoaderCircle, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { reportReasonLabels, submitContentReport, type ReportEntityType, type ReportReason } from '../lib/reports'

type ReportContentButtonProps = {
  entityType: ReportEntityType
  entityId: string
  entityLabel: string
  variant?: 'default' | 'photo'
}

export function ReportContentButton({ entityType, entityId, entityLabel, variant = 'default' }: ReportContentButtonProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [isSent, setIsSent] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleOpen() {
    if (!user) {
      const next = `${location.pathname}${location.search}${location.hash}`
      navigate(`/login?next=${encodeURIComponent(next)}`)
      return
    }
    setError(undefined)
    setIsOpen((current) => !current)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setIsSaving(true)
    setError(undefined)
    const result = await submitContentReport(user.id, { entityType, entityId, reason, details })
    if (result.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    setIsOpen(false)
    setIsSent(true)
    setDetails('')
    setIsSaving(false)
  }

  return (
    <div className={`report-control report-control--${variant}`}>
      {isSent ? <span className="report-control__sent"><Flag size={13} /> Laporan terkirim</span> : <button className="report-control__trigger" type="button" onClick={handleOpen}><Flag size={13} /> Laporkan</button>}
      {isOpen && createPortal(
        <div className="report-modal" role="presentation">
          <button className="report-modal__backdrop" type="button" aria-label="Tutup formulir laporan" onClick={() => setIsOpen(false)} />
          <form className="report-form" role="dialog" aria-modal="true" aria-labelledby={`report-dialog-title-${entityType}-${entityId}`} onSubmit={(event) => void handleSubmit(event)}>
            <div className="report-form__heading"><strong id={`report-dialog-title-${entityType}-${entityId}`}>Laporkan {entityLabel}</strong><button className="icon-button" type="button" onClick={() => setIsOpen(false)} aria-label="Tutup formulir laporan"><X size={14} /></button></div>
            <label><span>Alasan laporan</span><select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>{Object.entries(reportReasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Detail tambahan <small>(opsional)</small></span><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Jelaskan masalah yang kamu temukan..." /></label>
            {error && <div className="data-notice data-notice--error report-form__message" role="alert">{error}</div>}
            <div className="report-form__footer"><span>Admin akan meninjau laporan ini.</span><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={14} className="spin" /> : <Flag size={14} />} Kirim laporan</button></div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  )
}
