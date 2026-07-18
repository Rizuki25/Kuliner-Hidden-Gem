import { ArrowLeft, Chrome, LoaderCircle, Mail, Utensils } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type AuthMode = 'login' | 'signup'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading, signInWithPassword, signInWithGoogle, signUp } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  const requestedPath = searchParams.get('next')
  const nextPath = requestedPath?.startsWith('/') ? requestedPath : '/'

  if (!authLoading && user) {
    return <Navigate to={nextPath} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)
    setNotice(undefined)

    const result = mode === 'login'
      ? await signInWithPassword(email, password)
      : await signUp(displayName, email, password)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.needsEmailConfirmation) {
      setNotice('Akun berhasil dibuat. Cek email kamu untuk mengonfirmasi akun sebelum masuk.')
      return
    }

    navigate(nextPath)
  }

  async function handleGoogleLogin() {
    setError(undefined)
    setNotice(undefined)
    const result = await signInWithGoogle()
    if (result.error) setError(result.error)
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(undefined)
    setNotice(undefined)
  }

  return (
    <div className="auth-page page-width">
      <div className="auth-card">
        <div className="auth-card__brand"><span className="brand__mark"><Utensils size={18} /></span></div>
        <span className="section-kicker">{mode === 'login' ? 'SELAMAT DATANG KEMBALI' : 'MULAI MENJELAJAH'}</span>
        <h1>{mode === 'login' ? <>Masuk ke ruang<br /><em>kuliner kamu.</em></> : <>Buat ruang<br /><em>kuliner kamu.</em></>}</h1>
        <p className="auth-card__intro">Simpan tempat favorit, tulis ulasan, dan bantu orang lain menemukan hidden gem Bandung.</p>

        <button className="oauth-button" type="button" onClick={() => void handleGoogleLogin()} disabled={isSubmitting}>
          <Chrome size={17} /> Lanjutkan dengan Google
        </button>
        <div className="auth-divider"><span>atau dengan email</span></div>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'signup' && (
            <>
              <label htmlFor="display-name">Nama</label>
              <input id="display-name" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nama kamu" autoComplete="name" required />
            </>
          )}
          <label htmlFor="email">Email</label>
          <div className="input-with-icon"><Mail size={16} /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" required /></div>
          <label htmlFor="password">Kata sandi</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 6 karakter" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />

          {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
          {notice && <div className="auth-message auth-message--notice" role="status">{notice}</div>}

          <button className="button button--primary button--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle size={16} className="spin" /> : null}
            {mode === 'login' ? 'Masuk' : 'Buat akun'} <span>↗</span>
          </button>
        </form>

        <p className="auth-card__footnote">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button className="auth-toggle" type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
          </button>
        </p>
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali tanpa login</Link>
      </div>
    </div>
  )
}
