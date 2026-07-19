import { ArrowLeft, KeyRound, LoaderCircle, Mail } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)
    setNotice(undefined)

    const result = await requestPasswordReset(email)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setNotice('Jika email tersebut terdaftar, instruksi pemulihan sudah dikirim. Periksa inbox dan folder spam.')
  }

  return (
    <div className="auth-page page-width">
      <div className="auth-card">
        <div className="auth-card__brand"><span className="brand__mark"><KeyRound size={18} /></span></div>
        <span className="section-kicker">PEMULIHAN AKUN</span>
        <h1>Atur ulang<br /><em>kata sandimu.</em></h1>
        <p className="auth-card__intro">Masukkan email akunmu. Kami akan mengirim tautan untuk membuat kata sandi baru.</p>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="recovery-email">Email</label>
          <div className="input-with-icon"><Mail size={16} /><input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" required /></div>
          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {notice && <div className="auth-message auth-message--notice" role="status">{notice}</div>}
          <button className="button button--primary button--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle size={16} className="spin" /> : <KeyRound size={16} />}
            Kirim tautan pemulihan
          </button>
        </form>

        <p className="auth-card__footnote">Sudah ingat kata sandi? <Link to="/login">Kembali masuk</Link></p>
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali tanpa login</Link>
      </div>
    </div>
  )
}
