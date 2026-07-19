import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

type AuthActionResult = {
  error?: string
  needsEmailConfirmation?: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>
  signUp: (displayName: string, email: string, password: string) => Promise<AuthActionResult>
  requestPasswordReset: (email: string) => Promise<AuthActionResult>
  updatePassword: (password: string) => Promise<AuthActionResult>
  signInWithGoogle: () => Promise<AuthActionResult>
  signOut: () => Promise<AuthActionResult>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function missingSupabaseError(): AuthActionResult {
  return { error: 'Supabase belum dikonfigurasi. Periksa file .env.local.' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signInWithPassword: async (email, password) => {
      if (!supabase) return missingSupabaseError()

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      return error ? { error: error.message } : {}
    },
    signUp: async (displayName, email, password) => {
      if (!supabase) return missingSupabaseError()
      const normalizedDisplayName = displayName.trim()
      if (normalizedDisplayName.length < 2 || normalizedDisplayName.length > 80) return { error: 'Nama harus berisi 2–80 karakter.' }
      if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: normalizedDisplayName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) return { error: error.message }
      return { needsEmailConfirmation: !data.session }
    },
    requestPasswordReset: async (email) => {
      if (!supabase) return missingSupabaseError()
      const normalizedEmail = email.trim()
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return { error: 'Masukkan email yang valid.' }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return error ? { error: error.message } : {}
    },
    updatePassword: async (password) => {
      if (!supabase) return missingSupabaseError()
      if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }

      const { error } = await supabase.auth.updateUser({ password })
      return error ? { error: error.message } : {}
    },
    signInWithGoogle: async () => {
      if (!supabase) return missingSupabaseError()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      return error ? { error: error.message } : {}
    },
    signOut: async () => {
      if (!supabase) return missingSupabaseError()

      const { error } = await supabase.auth.signOut()
      return error ? { error: error.message } : {}
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return context
}
