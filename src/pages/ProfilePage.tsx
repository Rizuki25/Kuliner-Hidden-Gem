import { ArrowLeft, CheckCircle2, LoaderCircle, LockKeyhole, Save, ShieldCheck, UserCircle } from 'lucide-react'
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
    return <div className="page-width centered-page"><div className="centered-page__icon"><UserCircle size={24} /></div><span className="section-kicker">PROFIL</span><h1>Masuk untuk membuka profil</h1><p>Kelola nama tampilan dan keamanan akunmu dari satu tempat.</p><div className="centered-page__actions"><Link className="button button--primary" to="/login?next=%2Fprofil">Masuk</Link><Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali menjelajah</Link></div></div>
  }

  if (isLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memuat profil...</div>

  return (
    <div className="page-width profile-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Kembali ke jelajah</Link>
      <div className="profile-page__heading">
        <div className="centered-page__icon"><UserCircle size={24} /></div>
        <div><span className="section-kicker">PENGATURAN AKUN</span><h1>Profil kamu</h1><p>Perbarui identitas dan keamanan akun tanpa mengubah riwayat kontribusi.</p></div>
      </div>

      {error && <div className="data-notice data-notice--error profile-page__message" role="alert">{error}</div>}
      {notice && <div className="data-notice profile-page__message" role="status"><CheckCircle2 size={14} /> {notice}</div>}

      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-card__heading"><UserCircle size={19} /><div><span className="section-kicker">IDENTITAS</span><h2>Informasi profil</h2></div></div>
          <div className="profile-meta"><span>Role akun</span><strong><ShieldCheck size={14} /> {roleLabels[profile?.role ?? 'user']}</strong><span>Bergabung sejak</span><strong>{profile?.createdAt ? formatDate(profile.createdAt) : 'Belum tersedia'}</strong></div>
          <form className="profile-form" onSubmit={(event) => void handleProfileSubmit(event)}>
            <label><span>Email akun</span><input value={user.email ?? ''} readOnly /></label>
            <label><span>Nama tampilan</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={80} placeholder="Nama kamu" required /></label>
            <button className="button button--primary" type="submit" disabled={isSavingProfile}>{isSavingProfile ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />} Simpan profil</button>
          </form>
        </section>

        <section className="profile-card">
          <div className="profile-card__heading"><LockKeyhole size={19} /><div><span className="section-kicker">KEAMANAN</span><h2>Ganti kata sandi</h2></div></div>
          <p className="profile-card__intro">Gunakan minimal 8 karakter. Sesi akunmu tetap aktif setelah kata sandi diperbarui.</p>
          <form className="profile-form" onSubmit={(event) => void handlePasswordSubmit(event)}>
            <label><span>Kata sandi baru</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="Minimal 8 karakter" required /></label>
            <label><span>Ulangi kata sandi</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="Ketik ulang kata sandi" required /></label>
            <button className="button button--secondary" type="submit" disabled={isSavingPassword}>{isSavingPassword ? <LoaderCircle size={15} className="spin" /> : <LockKeyhole size={15} />} Perbarui kata sandi</button>
          </form>
        </section>
      </div>
    </div>
  )
}
