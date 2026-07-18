import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page-width centered-page centered-page--small">
      <div className="centered-page__icon"><Compass size={24} /></div>
      <span className="section-kicker">JALAN BUNTU</span>
      <h1>Tempatnya belum<br /><em>kami temukan.</em></h1>
      <p>Halaman yang kamu cari mungkin sudah pindah atau belum tersedia.</p>
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Kembali ke jelajah</Link>
    </div>
  )
}
