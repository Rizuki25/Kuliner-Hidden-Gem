import { ArrowLeft, CheckCircle2, ImagePlus, LoaderCircle, MapPin, Plus, Search, X } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LocationPicker } from '../components/LocationPicker'
import { useAuth } from '../context/AuthContext'
import { searchAddress, type GeocodingResult } from '../lib/geocoding'
import {
  createPlaceSubmission,
  MAX_SUBMISSION_PHOTOS,
  validateSubmissionPhoto,
  type NewPlaceSubmissionInput,
  type SubmissionHourInput,
} from '../lib/submissions'
import { dayLabels, dayOrder, type DayKey } from '../types/place'

const initialHours = (): Record<DayKey, SubmissionHourInput> => ({
  senin: { closed: false, open: '10:00', close: '22:00' },
  selasa: { closed: false, open: '10:00', close: '22:00' },
  rabu: { closed: false, open: '10:00', close: '22:00' },
  kamis: { closed: false, open: '10:00', close: '22:00' },
  jumat: { closed: false, open: '10:00', close: '22:00' },
  sabtu: { closed: false, open: '10:00', close: '22:00' },
  minggu: { closed: true, open: '10:00', close: '22:00' },
})

const defaultLatitude = -6.9175
const defaultLongitude = 107.6191

function safeCoordinate(value: string, fallback: number, minimum: number, maximum: number) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue >= minimum && parsedValue <= maximum ? parsedValue : fallback
}

export function SuggestPlacePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<NewPlaceSubmissionInput['category']>('makanan')
  const [priceRange, setPriceRange] = useState<NewPlaceSubmissionInput['priceRange']>('sedang')
  const [halalStatus, setHalalStatus] = useState<NewPlaceSubmissionInput['halalStatus']>('halal')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [latitude, setLatitude] = useState('-6.9175')
  const [longitude, setLongitude] = useState('107.6191')
  const [phone, setPhone] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [hours, setHours] = useState<Record<DayKey, SubmissionHourInput>>(initialHours)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [submitted, setSubmitted] = useState(false)
  const [geocodeResults, setGeocodeResults] = useState<GeocodingResult[]>([])
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string>()
  const [selectedLocationLabel, setSelectedLocationLabel] = useState('')
  const [locationConfirmed, setLocationConfirmed] = useState(false)

  const userLabel = useMemo(() => user?.email ?? 'akun aktif', [user?.email])

  function updateHour(day: DayKey, key: keyof SubmissionHourInput, value: string | boolean) {
    setHours((current) => ({
      ...current,
      [day]: { ...current[day], [key]: value },
    }))
  }

  function handlePhotoChange(files: FileList | null) {
    if (!files) return

    const nextFiles = Array.from(files)
    if (photos.length + nextFiles.length > MAX_SUBMISSION_PHOTOS) {
      setError(`Maksimal ${MAX_SUBMISSION_PHOTOS} foto untuk satu usulan.`)
      return
    }

    const validationError = nextFiles.map(validateSubmissionPhoto).find(Boolean)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(undefined)
    setPhotos((current) => [...current, ...nextFiles])
  }

  async function handleGeocode() {
    if (!address.trim()) {
      setGeocodeError('Isi alamat lengkap terlebih dahulu.')
      return
    }

    setIsGeocoding(true)
    setGeocodeError(undefined)
    setGeocodeResults([])

    try {
      const result = await searchAddress({ address, area })
      if (result.error) {
        setGeocodeError(result.error)
        return
      }
      if (result.results.length === 0) {
        setGeocodeError('Alamat belum ditemukan. Tambahkan nama jalan, nomor, atau patokan yang lebih spesifik.')
        return
      }

      setGeocodeResults(result.results)
    } catch {
      setGeocodeError('Pencarian alamat gagal. Coba lagi atau isi koordinat secara manual.')
    } finally {
      setIsGeocoding(false)
    }
  }

  function selectGeocodeResult(result: GeocodingResult) {
    setLatitude(result.latitude.toFixed(6))
    setLongitude(result.longitude.toFixed(6))
    setSelectedLocationLabel(result.displayName)
    setLocationConfirmed(true)
    setGeocodeResults([])
    setGeocodeError(undefined)
  }

  function handleManualLocationChange(nextLatitude: number, nextLongitude: number) {
    setLatitude(nextLatitude.toFixed(6))
    setLongitude(nextLongitude.toFixed(6))
    setSelectedLocationLabel('Pin dipilih dari peta')
    setLocationConfirmed(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const parsedLatitude = Number(latitude)
    const parsedLongitude = Number(longitude)
    const invalidHours = dayOrder.some((day) => !hours[day].closed && (!hours[day].open || !hours[day].close))

    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
      setError('Latitude harus berupa angka antara -90 dan 90.')
      return
    }
    if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
      setError('Longitude harus berupa angka antara -180 dan 180.')
      return
    }
    if (invalidHours) {
      setError('Lengkapi jam buka dan jam tutup pada setiap hari yang tidak ditutup.')
      return
    }
    if (!locationConfirmed) {
      setError('Klik peta untuk menempatkan pin pada lokasi tempat terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setError(undefined)

    const result = await createPlaceSubmission(user.id, {
      name,
      category,
      priceRange,
      halalStatus,
      description,
      address,
      area,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      phone,
      websiteUrl,
      hours,
      photos,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSubmitted(true)
  }

  if (authLoading) {
    return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memeriksa sesi login...</div>
  }

  if (!user) {
    return (
      <div className="page-width centered-page suggest-gate">
        <div className="centered-page__icon"><Plus size={24} /></div>
        <span className="section-kicker">Kontribusi komunitas</span>
        <h1>Login diperlukan untuk berkontribusi</h1>
        <p>Masuk terlebih dahulu agar usulan tempat tercatat atas nama akunmu.</p>
        <div className="centered-page__actions">
          <Link className="button button--primary" to="/login?next=%2Fusulkan-tempat">Masuk untuk mulai <span>↗</span></Link>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali menjelajah</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="page-width centered-page suggest-success">
        <div className="centered-page__icon centered-page__icon--success"><CheckCircle2 size={25} /></div>
        <span className="section-kicker">Usulan terkirim</span>
        <h1>Terima kasih sudah berbagi temuan</h1>
        <p>Usulanmu sudah masuk dan akan ditinjau admin. Tempat baru akan tampil setelah disetujui.</p>
        <div className="centered-page__actions">
          <Link className="button button--primary" to="/">Kembali menjelajah</Link>
          <Link className="button button--secondary" to="/kontribusi">Lihat riwayat kontribusi</Link>
          <button className="button button--secondary" type="button" onClick={() => { setSubmitted(false); navigate('/usulkan-tempat') }}>Usulkan tempat lain</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-width form-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link>
      <div className="form-page__heading">
        <div className="centered-page__icon"><Plus size={24} /></div>
        <div>
          <span className="section-kicker">Kontribusi komunitas</span>
          <h1>Kenalkan tempat yang kamu sayang</h1>
          <p>Usulan akan ditinjau admin sebelum ditampilkan secara publik.</p>
        </div>
      </div>

      <form className="submission-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="submission-form__identity"><span>Login sebagai</span><strong>{userLabel}</strong><Link to="/kontribusi">Riwayat kontribusi</Link></div>

        <div className="submission-form__section">
          <div className="submission-form__section-heading"><span>01</span><div><strong>Informasi dasar</strong><small>Ceritakan tempat yang ingin kamu rekomendasikan.</small></div></div>
          <div className="form-fields-grid">
            <div className="form-field form-field--wide"><label htmlFor="place-name">Nama tempat *</label><input id="place-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Warung Nasi Ibu..." minLength={2} maxLength={120} required /></div>
            <div className="form-field"><label htmlFor="category">Kategori *</label><select id="category" value={category} onChange={(event) => setCategory(event.target.value as NewPlaceSubmissionInput['category'])} required><option value="makanan">Makanan</option><option value="minuman">Minuman</option></select></div>
            <div className="form-field"><label htmlFor="price-range">Kisaran harga *</label><select id="price-range" value={priceRange} onChange={(event) => setPriceRange(event.target.value as NewPlaceSubmissionInput['priceRange'])} required><option value="murah">Di bawah 25K</option><option value="sedang">25K–60K</option><option value="mahal">Di atas 60K</option><option value="tidak_diketahui">Belum diketahui</option></select></div>
            <div className="form-field"><label htmlFor="halal-status">Label halal *</label><select id="halal-status" value={halalStatus} onChange={(event) => setHalalStatus(event.target.value as NewPlaceSubmissionInput['halalStatus'])} required><option value="halal">Halal</option><option value="non_halal">Non-halal</option><option value="belum_terverifikasi">Belum terverifikasi</option></select></div>
            <div className="form-field form-field--wide"><label htmlFor="description">Deskripsi singkat</label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Apa yang membuat tempat ini layak dicoba?" maxLength={2000} rows={4} /></div>
          </div>
        </div>

        <div className="submission-form__section">
          <div className="submission-form__section-heading"><span>02</span><div><strong>Lokasi dan kontak</strong><small>Bantu pengunjung menemukan tempatnya.</small></div></div>
          <div className="form-fields-grid">
            <div className="form-field form-field--wide"><label htmlFor="address">Alamat lengkap *</label><input id="address" value={address} onChange={(event) => { setAddress(event.target.value); setGeocodeResults([]); setGeocodeError(undefined); setSelectedLocationLabel(''); setLocationConfirmed(false) }} placeholder="Nama jalan, nomor, dan patokan" minLength={5} maxLength={240} required /></div>
            <div className="form-field"><label htmlFor="area">Kecamatan/area</label><input id="area" value={area} onChange={(event) => { setArea(event.target.value); setGeocodeResults([]); setGeocodeError(undefined); setSelectedLocationLabel(''); setLocationConfirmed(false) }} placeholder="Contoh: Coblong" maxLength={120} /></div>
            <div className="form-field"><label htmlFor="phone">Nomor telepon</label><input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Opsional" maxLength={40} /></div>
            <div className="form-field form-field--wide"><label htmlFor="website-url">Link usaha</label><input id="website-url" type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://... (opsional)" /></div>
          </div>
          <div className="geocoding-tools">
            <div className="geocoding-tools__actions">
              <button className="button button--secondary" type="button" onClick={() => void handleGeocode()} disabled={isGeocoding || !address.trim()}>
                {isGeocoding ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />}
                {isGeocoding ? 'Mencari alamat...' : 'Cari titik dari alamat'}
              </button>
              <span>{selectedLocationLabel ? `Lokasi: ${selectedLocationLabel}` : 'Cari alamat atau klik peta untuk memilih titik lokasi.'}</span>
            </div>
            {geocodeError && <div className="geocoding-error" role="alert">{geocodeError}</div>}
            {geocodeResults.length > 0 && (
              <div className="geocoding-results" aria-label="Hasil pencarian alamat">
                {geocodeResults.map((result) => (
                  <button type="button" key={result.placeId} onClick={() => selectGeocodeResult(result)}>
                    <MapPin size={16} />
                    <span>{result.displayName}<small>{result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="location-picker">
            <LocationPicker
              latitude={safeCoordinate(latitude, defaultLatitude, -90, 90)}
              longitude={safeCoordinate(longitude, defaultLongitude, -180, 180)}
              onChange={handleManualLocationChange}
            />
            <div className="form-help"><MapPin size={14} /> Klik peta untuk menempatkan pin. Pin juga bisa digeser untuk memperbaiki titik sebelum usulan dikirim.</div>
          </div>
        </div>

        <div className="submission-form__section">
          <div className="submission-form__section-heading"><span>03</span><div><strong>Foto tempat</strong><small>Foto membantu admin memeriksa dan pengunjung mengenali tempatnya.</small></div></div>
          <div className="photo-upload">
            <label className="photo-upload__dropzone" htmlFor="submission-photos">
              <ImagePlus size={21} />
              <span><strong>Pilih foto dari perangkat</strong><small>JPG, PNG, atau WebP · maksimal 5 MB per foto · {photos.length}/{MAX_SUBMISSION_PHOTOS}</small></span>
            </label>
            <input id="submission-photos" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { handlePhotoChange(event.target.files); event.currentTarget.value = '' }} />
            {photos.length > 0 && (
              <div className="photo-upload__list">
                {photos.map((photo, index) => (
                  <div className="photo-upload__item" key={`${photo.name}-${photo.lastModified}-${index}`}>
                    <ImagePlus size={15} />
                    <span>{photo.name}<small>{Math.ceil(photo.size / 1024)} KB</small></span>
                    <button type="button" aria-label={`Hapus ${photo.name}`} onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}><X size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="submission-form__section">
          <div className="submission-form__section-heading"><span>04</span><div><strong>Jam buka</strong><small>Atur jam operasional untuk setiap hari.</small></div></div>
          <div className="hours-editor">
            {dayOrder.map((day) => (
              <div className="hours-form-row" key={day}>
                <span className="hours-form-row__day">{dayLabels[day]}</span>
                <label className="hours-closed"><input type="checkbox" checked={hours[day].closed} onChange={(event) => updateHour(day, 'closed', event.target.checked)} /> Tutup</label>
                <input aria-label={`${dayLabels[day]} jam buka`} type="time" value={hours[day].open} onChange={(event) => updateHour(day, 'open', event.target.value)} disabled={hours[day].closed} required={!hours[day].closed} />
                <span className="hours-separator">—</span>
                <input aria-label={`${dayLabels[day]} jam tutup`} type="time" value={hours[day].close} onChange={(event) => updateHour(day, 'close', event.target.value)} disabled={hours[day].closed} required={!hours[day].closed} />
              </div>
            ))}
          </div>
        </div>

        {error && <div className="data-notice data-notice--error" role="alert">{error}</div>}
        <div className="submission-form__footer"><span>* wajib diisi · Usulan akan berstatus pending sampai ditinjau admin.</span><button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />} {isSubmitting ? 'Mengirim...' : 'Kirim usulan'}</button></div>
      </form>
    </div>
  )
}
