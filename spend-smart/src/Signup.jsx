import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useDarkMode } from './useDarkMode'
import Logo from './Logo'

function getStrength(pw) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 'Weak',   bars: 1, color: 'bg-red-400'    }
  if (score <= 2) return { level: 'Fair',   bars: 2, color: 'bg-amber-400'  }
  if (score <= 3) return { level: 'Good',   bars: 3, color: 'bg-emerald-400' }
  return              { level: 'Strong', bars: 4, color: 'bg-emerald-600' }
}

function StrengthBar({ password }) {
  const s = getStrength(password)
  if (!s) return null
  return (
    <div>
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= s.bars ? s.color : 'bg-gray-200 dark:bg-gray-600'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        s.level === 'Weak'   ? 'text-red-400' :
        s.level === 'Fair'   ? 'text-amber-400' :
        'text-emerald-500'
      }`}>{s.level}</p>
    </div>
  )
}

function Signup() {
  useDarkMode()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getStrength(password)
  const tooWeak = strength?.level === 'Weak'

  async function handleSignup(e) {
    e.preventDefault()
    if (tooWeak) {
      setMessage('Please choose a stronger password.')
      return
    }
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else if (data.session) {
      navigate('/dashboard')
    } else {
      setMessage('Check your email to confirm your account!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 p-8 rounded-2xl shadow-lg w-full max-w-sm transition-colors duration-300">
        <div className="flex items-center gap-2.5 mb-6">
          <Logo size={34} />
          <span className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 tracking-tight">SpendSmart</span>
        </div>
        <h2 className="text-2xl font-bold mb-1 text-gray-800 dark:text-gray-100">Create account</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Start tracking your spending</p>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-emerald-200 dark:border-gray-600 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm transition-colors"
          />
          <div className="flex flex-col gap-2">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-emerald-200 dark:border-gray-600 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm transition-colors"
            />
            <StrengthBar password={password} />
          </div>
          <button
            type="submit"
            disabled={loading || tooWeak}
            className="bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-400 dark:text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Log in</a>
        </p>
        {message && (
          <p className={`mt-2 text-sm text-center ${message.startsWith('Check') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {message}
          </p>
        )}
        <p className="mt-4 text-center">
          <a href="/wall" className="text-xs text-emerald-500 dark:text-emerald-400 hover:underline">
            See what users say ❤️
          </a>
        </p>
      </div>
    </div>
  )
}

export default Signup
