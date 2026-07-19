import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, LockKeyhole } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ResetPasswordPage() {
  const { user, loading: authLoading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.')
      return
    }
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi belum sama.')
      return
    }

    setIsSubmitting(true)
    setError(undefined)
    const result = await updatePassword(password)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setPassword('')
    setConfirmation('')
    setIsUpdated(true)
  }

  if (authLoading) return <div className="page-width detail-loading"><LoaderCircle size={18} className="spin" /> Memeriksa tautan pemulihan...</div>

  if (!user) {
    return (
      <div className="page-width centered-page auth-recovery-gate">
        <div className="centered-page__icon centered-page__icon--danger"><LockKeyhole size={24} /></div>
        <span className="section-kicker">TAUTAN TIDAK AKTIF</span>
        <h1>Permintaan pemulihan sudah kedaluwarsa</h1>
        <p>Minta tautan baru dan buka dari perangkat atau browser yang sama.</p>
        <div className="centered-page__actions"><Link className="button button--primary" to="/lupa-password">Minta tautan baru</Link><Link className="back-link" to="/login"><ArrowLeft size={15} /> Kembali masuk</Link></div>
      </div>
    )
  }

  if (isUpdated) {
    return (
      <div className="page-width centered-page auth-recovery-success">
        <div className="centered-page__icon centered-page__icon--success"><CheckCircle2 size={25} /></div>
        <span className="section-kicker">KATA SANDI DIPERBARUI</span>
        <h1>Akunmu sudah lebih aman</h1>
        <p>Kata sandi baru berhasil disimpan. Kamu dapat melanjutkan menjelajah atau membuka profil.</p>
        <div className="centered-page__actions"><Link className="button button--primary" to="/">Mulai menjelajah</Link><Link className="button button--secondary" to="/profil">Buka profil</Link></div>
      </div>
    )
  }

  return (
    <div className="auth-page page-width">
      <div className="auth-card">
        <div className="auth-card__brand"><span className="brand__mark"><KeyRound size={18} /></span></div>
        <span className="section-kicker">KATA SANDI BARU</span>
        <h1>Buat kata sandi<br /><em>yang lebih aman.</em></h1>
        <p className="auth-card__intro">Gunakan minimal 8 karakter dan jangan memakai kata sandi yang sama di banyak layanan.</p>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="new-password">Kata sandi baru</label>
          <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" minLength={8} autoComplete="new-password" required />
          <label htmlFor="confirm-password">Ulangi kata sandi</label>
          <input id="confirm-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Ketik ulang kata sandi" minLength={8} autoComplete="new-password" required />
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          <button className="button button--primary button--full" type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle size={16} className="spin" /> : <LockKeyhole size={16} />} Simpan kata sandi</button>
        </form>

        <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali ke halaman utama</Link>
      </div>
    </div>
  )
}
