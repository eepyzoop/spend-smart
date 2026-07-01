import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

// Reliable session restoration using onAuthStateChange, which fires on:
// - initial page load (INITIAL_SESSION)
// - token refresh (TOKEN_REFRESHED)
// - sign out (SIGNED_OUT)
// Unlike getSession(), this handles expired-but-refreshable tokens correctly.
export function useAuth() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
      } else {
        setUser(null)
        navigate('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return user
}
