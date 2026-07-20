import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, CircleUserRound, LoaderCircle, LockKeyhole, Mail, Save, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProfile, updateProfile, type ProfileRecord, type ProfileRole } from '../lib/profile'

const roleLabels: Record<ProfileRole, string> = {
  user: 'Pengunjung',
  owner: 'Owner terverifikasi',
  admin: 'Admin',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value))
}

export function ProfilePage() {
  const { user, loading: authLoading, updatePassword } = useAuth()
  const [profile, setProfile] = useState<ProfileRecord>()
  const [displayName, setDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    let isMounted = true
    if (!user) {
      setProfile(undefined)
      setIsLoading(false)
      return () => { isMounted = false }
    }

    setIsLoading(true)
    fetchProfile(user.id).then((result) => {
      if (!isMounted) return
      setProfile(result.profile)
      setDisplayName(result.profile?.displayName ?? user.user_metadata.display_name ?? '')
      setError(result.error)
      setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [user?.id])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setIsSavingProfile(true)
    setError(undefined)
    setNotice(undefined)
    const result = await updateProfile(user.id, displayName)
    setIsSavingProfile(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setProfile(result.profile)
    setDisplayName(result.profile?.displayName ?? displayName.trim())
    setNotice('Profil berhasil diperbarui.')
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi belum sama.')
      return
    }

    setIsSavingPassword(true)
    setError(undefined)
    setNotice(undefined)
    const result = await updatePassword(newPassword)
    setIsSavingPassword(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setNotice('Kata sandi berhasil diperbarui.')
  }

  if (authLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memuat akun...</div>

  if (!user) {
    return <div className="page-width centered-page profile-gate"><div className="centered-page__icon"><CircleUserRound size={24} /></div><span className="section-kicker">PROFIL</span><h1>Masuk untuk membuka profil</h1><p>Kelola nama tampilan dan keamanan akunmu dari satu tempat.</p><div className="centered-page__actions"><Link className="button button--primary" to="/login?next=%2Fprofil">Masuk</Link><Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali menjelajah</Link></div></div>
  }

  if (isLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memuat profil...</div>

  const initials = (displayName || user.email?.split('@')[0] || 'KT').trim().slice(0, 2).toUpperCase()
  const currentRole = profile?.role ?? 'user'

  return (
    <div className="page-width profile-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link>

      <section className="profile-hero">
        <div className="profile-hero__art" aria-hidden="true"><span>KT</span><i /><i /><i /></div>
        <div className="profile-hero__content">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div className="profile-hero__copy"><span className="section-kicker">AKUN KULINER TERSEMBUNYI</span><h1>Profil kamu</h1><p>Atur identitas dan keamanan akun untuk pengalaman jelajah yang lebih personal.</p></div>
          <span className="profile-role-badge"><ShieldCheck size={14} /> {roleLabels[currentRole]}</span>
        </div>
      </section>

      {error && <div className="data-notice data-notice--error profile-page__message" role="alert">{error}</div>}
      {notice && <div className="data-notice profile-page__message" role="status"><CheckCircle2 size={14} /> {notice}</div>}

      <div className="profile-layout">
        <aside className="profile-overview">
          <div className="profile-overview__heading"><span className="section-kicker">RINGKASAN AKUN</span><strong>{displayName || 'Pengunjung Bandung'}</strong></div>
          <div className="profile-overview__email"><Mail size={15} /> <span>{user.email}</span></div>
          <div className="profile-overview__items">
            <div><CalendarDays size={16} /><span><small>Bergabung sejak</small><strong>{profile?.createdAt ? formatDate(profile.createdAt) : 'Belum tersedia'}</strong></span></div>
            <div><ShieldCheck size={16} /><span><small>Status akun</small><strong>Terverifikasi</strong></span></div>
          </div>
          <Link className="profile-overview__link" to="/kontribusi">Lihat riwayat kontribusi <ArrowUpRight size={14} /></Link>
        </aside>

        <div className="profile-sections">
          <section className="profile-card profile-card--identity">
            <div className="profile-card__heading"><div className="profile-card__icon"><CircleUserRound size={19} /></div><div><span className="section-kicker">IDENTITAS</span><h2>Informasi profil</h2><p>Nama ini akan digunakan saat kamu berkontribusi atau memberi ulasan.</p></div></div>
            <form className="profile-form" onSubmit={(event) => void handleProfileSubmit(event)}>
              <label><span>Email akun</span><div className="profile-input-wrap"><Mail size={16} /><input value={user.email ?? ''} readOnly /></div></label>
              <label><span>Nama tampilan</span><div className="profile-input-wrap"><CircleUserRound size={16} /><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={80} placeholder="Nama kamu" required /></div></label>
              <div className="profile-form__footer"><small>2–80 karakter</small><button className="button button--primary" type="submit" disabled={isSavingProfile}>{isSavingProfile ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />} Simpan profil</button></div>
            </form>
          </section>

          <section className="profile-card profile-card--security">
            <div className="profile-card__heading"><div className="profile-card__icon"><LockKeyhole size={19} /></div><div><span className="section-kicker">KEAMANAN</span><h2>Ganti kata sandi</h2><p>Gunakan minimal 8 karakter agar akun tetap aman.</p></div></div>
            <form className="profile-form" onSubmit={(event) => void handlePasswordSubmit(event)}>
              <div className="profile-form__fields"><label><span>Kata sandi baru</span><div className="profile-input-wrap"><LockKeyhole size={16} /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="Minimal 8 karakter" required /></div></label><label><span>Ulangi kata sandi</span><div className="profile-input-wrap"><LockKeyhole size={16} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="Ketik ulang kata sandi" required /></div></label></div>
              <div className="profile-form__footer"><small>Sesi tetap aktif setelah diperbarui</small><button className="button button--secondary" type="submit" disabled={isSavingPassword}>{isSavingPassword ? <LoaderCircle size={15} className="spin" /> : <LockKeyhole size={15} />} Perbarui kata sandi</button></div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
