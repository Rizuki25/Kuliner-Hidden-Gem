import { ArrowLeft, Check, CheckCircle2, ExternalLink, Image, ImagePlus, Instagram, LoaderCircle, MapPin, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SuccessPopup } from '../components/SuccessPopup'
import { useAuth } from '../context/AuthContext'
import {
  deleteOwnedPhoto,
  fetchOwnedPlaces,
  MAX_OWNER_PHOTOS_PER_UPLOAD,
  setOwnedPhotoCover,
  updateOwnedPlace,
  uploadOwnerPhotos,
  validateOwnerPhoto,
  type OwnerHourInput,
  type OwnerPlaceRecord,
  type OwnerPlaceUpdateInput,
  type OwnerPhotoRecord,
} from '../lib/ownerManagement'
import { dayLabels, dayOrder, type DayKey } from '../types/place'

type OwnerEditState = OwnerPlaceUpdateInput

function createEditState(place: OwnerPlaceRecord): OwnerEditState {
  return {
    description: place.description ?? '',
    phone: place.phone ?? '',
    websiteUrl: place.websiteUrl ?? '',
    instagramUrl: place.instagramUrl ?? '',
    hours: Object.fromEntries(dayOrder.map((day) => [day, { ...place.hours[day] }])) as Record<DayKey, OwnerHourInput>,
  }
}

function formatCategory(value: OwnerPlaceRecord['category']) {
  return value === 'makanan' ? 'Makanan' : 'Minuman'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function OwnerPlaceEditor({ place, userId, onRefresh }: { place: OwnerPlaceRecord; userId: string; onRefresh: () => Promise<void> }) {
  const [form, setForm] = useState<OwnerEditState>(() => createEditState(place))
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [busyPhotoId, setBusyPhotoId] = useState<string>()
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [isUploadSuccessOpen, setIsUploadSuccessOpen] = useState(false)

  useEffect(() => {
    setForm(createEditState(place))
    setNewPhotos([])
    setError(undefined)
    setNotice(undefined)
    setIsUploadSuccessOpen(false)
  }, [place.id])

  function updateField<Key extends keyof OwnerEditState>(key: Key, value: OwnerEditState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateHour(day: DayKey, key: keyof OwnerHourInput, value: string | boolean) {
    setForm((current) => ({
      ...current,
      hours: {
        ...current.hours,
        [day]: {
          ...current.hours[day],
          [key]: value,
          ...(key === 'closed' && value ? { is24Hours: false } : {}),
        },
      },
    }))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(undefined)
    setNotice(undefined)
    const result = await updateOwnedPlace(userId, place.id, form)
    if (result.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    setNotice('Informasi tempat dan jam buka berhasil diperbarui.')
    await onRefresh()
    setIsSaving(false)
  }

  function handlePhotoChange(files: FileList | null) {
    if (!files) return
    const selected = Array.from(files)
    if (selected.length > MAX_OWNER_PHOTOS_PER_UPLOAD) {
      setError(`Maksimal ${MAX_OWNER_PHOTOS_PER_UPLOAD} foto per upload.`)
      return
    }
    const validationError = selected.map(validateOwnerPhoto).find(Boolean)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(undefined)
    setNewPhotos(selected)
  }

  async function handleUploadPhotos() {
    if (newPhotos.length === 0) {
      setError('Pilih minimal satu foto terlebih dahulu.')
      return
    }
    setIsUploading(true)
    setError(undefined)
    setNotice(undefined)
    const result = await uploadOwnerPhotos(userId, place.id, newPhotos, place.photos)
    if (result.error) {
      setError(result.error)
      setIsUploading(false)
      return
    }
    setNewPhotos([])
    await onRefresh()
    setIsUploading(false)
    setIsUploadSuccessOpen(true)
  }

  async function handleDeletePhoto(photo: OwnerPhotoRecord) {
    if (!window.confirm('Hapus foto ini dari tempat publik?')) return
    setBusyPhotoId(photo.id)
    setError(undefined)
    setNotice(undefined)
    const result = await deleteOwnedPhoto(place.id, photo)
    if (result.error) {
      setError(result.error)
      setBusyPhotoId(undefined)
      return
    }
    setNotice('Foto berhasil dihapus dari tempat publik.')
    await onRefresh()
    setBusyPhotoId(undefined)
  }

  async function handleSetCover(photo: OwnerPhotoRecord) {
    if (photo.isCover) return
    setBusyPhotoId(photo.id)
    setError(undefined)
    setNotice(undefined)
    const result = await setOwnedPhotoCover(place.id, photo.id)
    if (result.error) {
      setError(result.error)
      setBusyPhotoId(undefined)
      return
    }
    setNotice('Foto sampul berhasil diubah.')
    await onRefresh()
    setBusyPhotoId(undefined)
  }

  return (
    <article className="owner-editor">
      <div className="owner-editor__topline">
        <div><span className="section-kicker">TEMPAT TERVERIFIKASI</span><h2>{place.name}</h2><p><MapPin size={14} /> {place.address}{place.area ? ` · ${place.area}` : ''}</p></div>
        <Link className="button button--secondary" to={`/tempat/${place.id}`}><ExternalLink size={15} /> Lihat publik</Link>
      </div>

      <div className="owner-editor__meta"><span>{formatCategory(place.category)}</span><span>{place.priceRange.replace('_', ' ')}</span><span>{place.halalStatus.replace(/_/g, '-')}</span><span>Terakhir diperbarui {formatDate(place.updatedAt)}</span></div>
      {error && <div className="data-notice data-notice--error owner-editor__message" role="alert">{error}</div>}
      {notice && <div className="data-notice owner-editor__message" role="status">{notice}</div>}

      <form onSubmit={(event) => void handleSave(event)}>
        <section className="owner-editor__section">
          <div className="owner-editor__section-heading"><span>01</span><div><strong>Informasi usaha</strong><small>Perbarui informasi yang dilihat pengunjung.</small></div></div>
          <div className="form-fields-grid">
            <div className="form-field form-field--wide"><label htmlFor={`owner-description-${place.id}`}>Deskripsi tempat</label><textarea id={`owner-description-${place.id}`} value={form.description} onChange={(event) => updateField('description', event.target.value)} maxLength={2000} rows={5} placeholder="Ceritakan menu andalan, suasana, atau cerita tempat ini..." /></div>
            <div className="form-field"><label htmlFor={`owner-phone-${place.id}`}>Nomor telepon</label><input id={`owner-phone-${place.id}`} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} maxLength={40} inputMode="tel" /></div>
            <div className="form-field"><label htmlFor={`owner-website-${place.id}`}>Link website</label><input id={`owner-website-${place.id}`} type="url" value={form.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} placeholder="https://..." /></div>
            <div className="form-field form-field--wide"><label htmlFor={`owner-instagram-${place.id}`}><Instagram size={13} /> Link Instagram</label><input id={`owner-instagram-${place.id}`} type="url" value={form.instagramUrl} onChange={(event) => updateField('instagramUrl', event.target.value)} placeholder="https://instagram.com/..." /></div>
          </div>
        </section>

        <section className="owner-editor__section">
          <div className="owner-editor__section-heading"><span>02</span><div><strong>Jam operasional</strong><small>Atur jam buka yang tampil di halaman publik.</small></div></div>
          <div className="owner-hours-editor">
            {dayOrder.map((day) => {
              const hour = form.hours[day]
              return <div className="owner-hours-row" key={day}><span>{dayLabels[day]}</span><label><input type="checkbox" checked={hour.closed} onChange={(event) => updateHour(day, 'closed', event.target.checked)} /> Tutup</label><label><input type="checkbox" checked={hour.is24Hours} disabled={hour.closed} onChange={(event) => updateHour(day, 'is24Hours', event.target.checked)} /> 24 jam</label><input aria-label={`${dayLabels[day]} jam buka`} type="time" value={hour.open} disabled={hour.closed || hour.is24Hours} onChange={(event) => updateHour(day, 'open', event.target.value)} required={!hour.closed && !hour.is24Hours} /><span>–</span><input aria-label={`${dayLabels[day]} jam tutup`} type="time" value={hour.close} disabled={hour.closed || hour.is24Hours} onChange={(event) => updateHour(day, 'close', event.target.value)} required={!hour.closed && !hour.is24Hours} /></div>
            })}
          </div>
        </section>

        <div className="owner-editor__footer"><span>Nama, kategori, alamat, dan titik peta hanya dapat diubah melalui admin.</span><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />} Simpan perubahan</button></div>
      </form>

      <section className="owner-editor__section owner-editor__photos-section">
        <div className="owner-editor__section-heading"><span>03</span><div><strong>Foto tempat</strong><small>Foto yang ditambahkan owner terverifikasi langsung tampil setelah berhasil disimpan.</small></div></div>
        <div className="owner-photo-upload">
          <label className="owner-photo-upload__dropzone" htmlFor={`owner-photos-${place.id}`}><Upload size={19} /><span><strong>Pilih foto baru</strong><small>JPG, PNG, WebP · maksimal 5 MB · hingga {MAX_OWNER_PHOTOS_PER_UPLOAD} foto per upload</small></span></label>
          <input id={`owner-photos-${place.id}`} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { handlePhotoChange(event.target.files); event.currentTarget.value = '' }} />
          {newPhotos.length > 0 && <div className="owner-photo-upload__selected"><span>{newPhotos.length} foto siap diunggah</span><button className="button button--primary" type="button" onClick={() => void handleUploadPhotos()} disabled={isUploading}>{isUploading ? <LoaderCircle size={15} className="spin" /> : <ImagePlus size={15} />} Upload foto</button></div>}
        </div>

        {place.photos.length === 0 ? <div className="owner-photo-empty"><Image size={21} /><span>Belum ada foto pada tempat ini.</span></div> : <div className="owner-photo-grid">{place.photos.map((photo) => {
          const isBusy = busyPhotoId === photo.id
          return <article className="owner-photo-card" key={photo.id}>
            <div className="owner-photo-card__visual">{photo.url ? <img src={photo.url} alt={`Foto ${place.name}`} /> : <div><Image size={23} /><span>Preview tidak tersedia</span></div>}{photo.isCover && <span className="owner-photo-card__cover"><CheckCircle2 size={12} /> Sampul</span>}</div>
            <div className="owner-photo-card__body"><span className={`owner-photo-card__status owner-photo-card__status--${photo.publicationStatus}`}>{photo.publicationStatus === 'approved' ? 'Tampil publik' : photo.publicationStatus}</span><small>{photo.caption || 'Foto tempat'}</small><div><button className="button button--secondary" type="button" onClick={() => void handleSetCover(photo)} disabled={isBusy || photo.isCover}><Check size={13} /> Jadikan sampul</button><button className="button button--danger-ghost" type="button" onClick={() => void handleDeletePhoto(photo)} disabled={isBusy}>{isBusy ? <LoaderCircle size={13} className="spin" /> : <Trash2 size={13} />} Hapus</button></div></div>
          </article>
        })}</div>}
      </section>
      <SuccessPopup
        isOpen={isUploadSuccessOpen}
        title="Upload Berhasil!"
        message="Foto berhasil ditambahkan ke tempat publik."
        onClose={() => setIsUploadSuccessOpen(false)}
      />
    </article>
  )
}

export function OwnerManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedPlaceId = searchParams.get('place')
  const [places, setPlaces] = useState<OwnerPlaceRecord[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState(requestedPlaceId ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function loadPlaces(showLoading = true) {
    if (!user) return
    if (showLoading) setIsLoading(true)
    setError(undefined)
    const result = await fetchOwnedPlaces(user.id)
    if (result.error) {
      setPlaces([])
      setError(result.error)
    } else {
      setPlaces(result.places)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    void loadPlaces()
  }, [user?.id])

  useEffect(() => {
    if (places.length === 0) return
    setSelectedPlaceId((current) => places.some((place) => place.id === current) ? current : (places.some((place) => place.id === requestedPlaceId) ? requestedPlaceId! : places[0].id))
  }, [places, requestedPlaceId])

  const selectedPlace = useMemo(() => places.find((place) => place.id === selectedPlaceId), [places, selectedPlaceId])

  if (authLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memeriksa sesi login...</div>

  if (!user) {
    return <div className="page-width centered-page"><div className="centered-page__icon"><ShieldCheck size={24} /></div><span className="section-kicker">RUANG OWNER</span><h1>Masuk untuk<br /><em>mengelola tempat.</em></h1><p>Halaman ini hanya tersedia untuk pemilik usaha yang sudah diverifikasi admin.</p><div className="centered-page__actions"><Link className="button button--primary" to="/login?next=%2Fkelola-tempat">Masuk sebagai owner</Link><Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali menjelajah</Link></div></div>
  }

  if (isLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memuat tempat yang kamu kelola...</div>

  if (error) return <div className="page-width centered-page"><div className="data-notice data-notice--error" role="alert">Data tempat gagal dimuat: {error}</div><Link className="button button--secondary" to="/"><ArrowLeft size={15} /> Kembali</Link></div>

  if (places.length === 0) return <div className="page-width centered-page"><div className="centered-page__icon"><ShieldCheck size={24} /></div><span className="section-kicker">RUANG OWNER</span><h1>Belum ada tempat<br /><em>yang terverifikasi.</em></h1><p>Ajukan klaim dari halaman detail tempat. Setelah admin menyetujui, tempat akan muncul di ruang pengelolaan ini.</p><div className="centered-page__actions"><Link className="button button--primary" to="/"><MapPin size={15} /> Cari tempat</Link><Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali ke jelajah</Link></div></div>

  return <div className="page-width owner-page"><Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link><div className="owner-page__heading"><div><span className="section-kicker">RUANG OWNER</span><h1>Rawat tempat<br /><em>yang kamu kelola.</em></h1><p>Perbarui informasi, jam operasional, dan foto untuk membantu pengunjung mendapat informasi terbaru.</p></div><div className="owner-page__badge"><ShieldCheck size={18} /><span>Pemilik terverifikasi<br /><strong>{places.length} tempat</strong></span></div></div>{places.length > 1 && <div className="owner-place-tabs" role="tablist" aria-label="Pilih tempat yang dikelola">{places.map((place) => <button key={place.id} className={selectedPlaceId === place.id ? 'is-active' : ''} type="button" onClick={() => setSelectedPlaceId(place.id)}>{place.name}<small>{place.area || 'Bandung'}</small></button>)}</div>}{selectedPlace && <OwnerPlaceEditor key={selectedPlace.id} place={selectedPlace} userId={user.id} onRefresh={() => loadPlaces(false)} />}</div>
}
