/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContextType, AuthProviderProps } from '../types/Auth'
import { getUrlWithoutTrailingSlash } from '../lib/util';

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we have token_hash in URL (magic link callback)
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const type = params.get('type')

    if (token_hash) {
      // Verify the OTP token
      supabase.auth
        .verifyOtp({
          token_hash,
          type: (type as EmailOtpType) || 'magiclink',
        })
        .then(({ error }) => {
          if (error) {
            console.error('OTP verification failed:', error.message)
          }
          // Clear URL params after verification attempt
          window.history.replaceState({}, document.title, window.location.pathname)
          setLoading(false)
        })
    } else {
      // Check for existing session on mount
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })
    }

    // Listen for auth changes (magic link callback, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const url: string =
    import.meta.env.VITE_BASE_URL ?? // Set this to your site URL in production env.
    'http://localhost:5173/'

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getUrlWithoutTrailingSlash(url),
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
