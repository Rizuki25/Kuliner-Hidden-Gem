import { Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AppShell } from './components/layout/AppShell'
import { AdminPage } from './pages/AdminPage'
import { ContributionHistoryPage } from './pages/ContributionHistoryPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OwnerManagementPage } from './pages/OwnerManagementPage'
import { PlaceDetailPage } from './pages/PlaceDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SuggestPlacePage } from './pages/SuggestPlacePage'

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="tempat/:placeId" element={<PlaceDetailPage />} />
          <Route path="favorit" element={<FavoritesPage />} />
          <Route path="kontribusi" element={<ContributionHistoryPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="lupa-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="usulkan-tempat" element={<SuggestPlacePage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="kelola-tempat" element={<OwnerManagementPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </MotionConfig>
  )
}

export default App
