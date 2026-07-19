import { Archive, Check, CheckCircle2, ExternalLink, EyeOff, Flag, LoaderCircle, MapPin, Search, ShieldAlert, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ModerationResult } from '../lib/moderation'
import { actionReport, archiveReportedContent, ignoreReport, reportEntityLabels, reportReasonLabels, type ContentReportAdminRecord, type ReportStatus } from '../lib/reports'

type ReportFilter = 'all' | ReportStatus

type ReportModerationPanelProps = {
  reports: ContentReportAdminRecord[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  onError: (error?: string) => void
}

const statusLabels: Record<ReportStatus, string> = {
  pending: 'Menunggu',
  ignored: 'Diabaikan',
  actioned: 'Ditindaklanjuti',
}

const statusIcons: Record<ReportStatus, typeof ShieldAlert> = {
  pending: ShieldAlert,
  ignored: EyeOff,
  actioned: CheckCircle2,
}

function ReportStatusPill({ status }: { status: ReportStatus }) {
  const StatusIcon = statusIcons[status]
  return <span className={`admin-status admin-status--${status}`}><StatusIcon size={13} /> {statusLabels[status]}</span>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function ReportModerationPanel({ reports, isLoading, onRefresh, onError }: ReportModerationPanelProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<ReportFilter>('pending')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string>()

  const visibleReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return reports.filter((report) => {
      const matchesStatus = filter === 'all' || report.status === filter
      const matchesQuery = !normalizedQuery || [report.entityLabel, report.entitySubtitle ?? '', report.reporterName ?? '', report.reportedBy, report.reason, report.details ?? '']
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [filter, query, reports])

  async function runAction(report: ContentReportAdminRecord, action: (adminId: string, report: ContentReportAdminRecord) => Promise<ModerationResult>) {
    if (!user) return
    setBusyId(report.id)
    onError(undefined)
    const result = await action(user.id, report)
    setBusyId(undefined)
    if (result.error) {
      onError(result.error)
      return
    }
    await onRefresh()
  }

  return (
    <section className="admin-workspace admin-report-workspace" id="laporan-konten" aria-label="Daftar laporan konten">
      <div className="admin-workspace__toolbar">
        <div><span className="section-kicker">LAPORAN KONTEN</span><h2>Periksa laporan</h2></div>
        <label className="admin-search"><Search size={16} /><span className="sr-only">Cari laporan</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari konten, alasan, atau pelapor" /></label>
      </div>
      <div className="admin-filter-tabs" role="tablist" aria-label="Filter status laporan">
        {(['pending', 'all', 'actioned', 'ignored'] as ReportFilter[]).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} type="button" onClick={() => setFilter(item)}>{item === 'all' ? 'Semua' : statusLabels[item]}</button>)}
      </div>

      {isLoading ? (
        <div className="admin-empty"><LoaderCircle size={22} className="spin" /><h2>Memuat laporan...</h2><p>Mengambil laporan konten terbaru.</p></div>
      ) : visibleReports.length === 0 ? (
        <div className="admin-empty"><Flag size={22} /><h2>Tidak ada laporan di sini</h2><p>Coba pilih status lain atau ubah kata kunci pencarian.</p></div>
      ) : (
        <div className="admin-report-list">
          {visibleReports.map((report) => {
            const isBusy = busyId === report.id
            return <article className="admin-report-card" key={report.id}>
              <div className="admin-submission-card__topline"><ReportStatusPill status={report.status} /><span>Dilaporkan {formatDate(report.createdAt)}</span></div>
              <div className="admin-report-card__body">
                <div className="admin-report-card__heading"><div><span className="section-kicker">{reportEntityLabels[report.entityType]}</span><h3>{report.entityLabel}</h3></div><span className="admin-submission-card__id">#{report.id.slice(0, 8)}</span></div>
                <div className="admin-report-card__reason"><strong>{reportReasonLabels[report.reason]}</strong>{report.details && <span>{report.details}</span>}</div>
                {report.entityPhotoUrl && <img className="admin-report-card__photo" src={report.entityPhotoUrl} alt={report.entityLabel} />}
                {report.entitySubtitle && <p className="admin-report-card__entity-text">{report.entitySubtitle}</p>}
                <div className="admin-report-card__meta"><UserRound size={14} /><span>Pelapor</span><strong>{report.reporterName || 'Nama belum tersedia'}</strong><small>{report.reportedBy}</small></div>
                {report.entityPlaceId && <Link className="admin-report-card__place-link" to={`/tempat/${report.entityPlaceId}`} target="_blank"><MapPin size={13} /> Buka tempat publik <ExternalLink size={12} /></Link>}
              </div>
              {report.status === 'pending' ? <div className="admin-submission-card__actions">
                <button className="button button--secondary" type="button" onClick={() => void runAction(report, ignoreReport)} disabled={isBusy}>{isBusy ? <LoaderCircle size={14} className="spin" /> : <EyeOff size={14} />} Abaikan</button>
                <button className="button button--primary" type="button" onClick={() => void runAction(report, actionReport)} disabled={isBusy}>{isBusy ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />} Tandai ditindaklanjuti</button>
                <button className="button button--danger-ghost" type="button" onClick={() => void runAction(report, archiveReportedContent)} disabled={isBusy}>{isBusy ? <LoaderCircle size={14} className="spin" /> : <Archive size={14} />} Arsipkan konten</button>
              </div> : <div className="admin-report-card__resolved"><CheckCircle2 size={14} /> Laporan sudah {statusLabels[report.status].toLowerCase()} pada {formatDate(report.reviewedAt ?? report.updatedAt)}.</div>}
            </article>
          })}
        </div>
      )}
    </section>
  )
}
