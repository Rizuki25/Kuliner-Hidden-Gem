import { Compass, Heart, LogIn, LogOut, MapPin, Plus, UserCircle, Utensils } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { label: 'Jelajah', to: '/', icon: Compass, end: true },
  { label: 'Favorit', to: '/favorit', icon: Heart },
  { label: 'Kontribusi', to: '/kontribusi', icon: Plus },
]

export function AppShell() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const isHome = location.pathname === '/'
  const isPlaceDetail = location.pathname.startsWith('/tempat/')
  const usesMarketplaceTheme = isHome || isPlaceDetail || location.pathname === '/favorit' || location.pathname === '/kontribusi' || location.pathname === '/usulkan-tempat' || isAdmin
  const { user, signOut } = useAuth()

  return (
    <div className={`app-shell${usesMarketplaceTheme ? ' app-shell--airbnb' : ''}${isHome ? ' app-shell--home' : ''}`}>
      <header className="topbar">
        <div className="topbar__inner page-width">
          <NavLink className="brand" to="/" aria-label="Kuliner Tersembunyi, halaman utama">
            <span className="brand__mark"><Utensils size={18} strokeWidth={2.4} /></span>
            <span className="brand__text">
              <strong>Kuliner</strong>
              <span>Tersembunyi</span>
            </span>
          </NavLink>

          <nav className="desktop-nav" aria-label="Navigasi utama">
            {navItems.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar__actions">
            <span className="city-pill"><MapPin size={14} /> Bandung</span>
            {user ? (
              <div className="topbar__account">
                <NavLink className="login-link" to="/profil" title={user.email ?? 'Buka profil'}><UserCircle size={16} /><span>Profil</span></NavLink>
                <button className="login-link" type="button" onClick={() => void signOut()} title="Keluar dari akun"><LogOut size={16} /><span>Keluar</span></button>
              </div>
            ) : (
              <NavLink className="login-link" to="/login">
                <LogIn size={16} />
                <span>Masuk</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {isAdmin && (
        <div className="admin-strip">
          <div className="page-width admin-strip__inner">
            <span>Mode admin</span>
            <span className="admin-strip__note">Moderasi kontribusi aktif</span>
          </div>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="Navigasi mobile">
        {navItems.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `mobile-nav__item${isActive ? ' is-active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user ? (
          <button className="mobile-nav__item" type="button" onClick={() => void signOut()}>
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) => `mobile-nav__item${isActive ? ' is-active' : ''}`}
          >
            <LogIn size={20} />
            <span>Masuk</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
