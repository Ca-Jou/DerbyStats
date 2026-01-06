import { User, Session } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export interface AuthProviderProps {
  children: React.ReactNode
}