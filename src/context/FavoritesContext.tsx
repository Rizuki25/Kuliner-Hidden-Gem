import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

type FavoriteActionResult = {
  error?: string
  requiresLogin?: boolean
  isFavorite?: boolean
}

type FavoritesContextValue = {
  favoriteIds: string[]
  loading: boolean
  error?: string
  isFavorite: (placeId: string) => boolean
  toggleFavorite: (placeId: string) => Promise<FavoriteActionResult>
  refreshFavorites: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function refreshFavorites() {
    if (!user || !supabase) {
      setFavoriteIds([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(undefined)

    const { data, error: queryError } = await supabase
      .from('favorites')
      .select('place_id')
      .eq('user_id', user.id)

    if (queryError) {
      setError(queryError.message)
      setFavoriteIds([])
    } else {
      setFavoriteIds((data ?? []).map((item) => item.place_id as string))
    }

    setLoading(false)
  }

  useEffect(() => {
    void refreshFavorites()
  }, [user?.id])

  const value = useMemo<FavoritesContextValue>(() => ({
    favoriteIds,
    loading,
    error,
    isFavorite: (placeId) => favoriteIds.includes(placeId),
    toggleFavorite: async (placeId) => {
      if (!user || !supabase) {
        return { requiresLogin: true }
      }

      const wasFavorite = favoriteIds.includes(placeId)
      setError(undefined)
      setFavoriteIds((current) => wasFavorite
        ? current.filter((id) => id !== placeId)
        : [...current, placeId])

      const result = wasFavorite
        ? await supabase.from('favorites').delete().eq('user_id', user.id).eq('place_id', placeId)
        : await supabase.from('favorites').insert({ user_id: user.id, place_id: placeId })

      if (result.error) {
        setFavoriteIds((current) => wasFavorite
          ? [...current, placeId]
          : current.filter((id) => id !== placeId))
        setError(result.error.message)
        return { error: result.error.message, isFavorite: wasFavorite }
      }

      return { isFavorite: !wasFavorite }
    },
    refreshFavorites,
  }), [error, favoriteIds, loading, user?.id])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites harus digunakan di dalam FavoritesProvider')
  return context
}
