import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useDarkMode } from './useDarkMode'
import Logo from './Logo'
import FlyingDollars from './FlyingDollars'
import { useInstallPrompt } from './useInstallPrompt'

function Login() {
  useDarkMode()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { showInstall, handleInstall, showIosBanner, dismissIosBanner } = useInstallPrompt('ss-ios-login-dismissed')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <FlyingDollars />
      <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 p-8 rounded-2xl shadow-lg w-full max-w-sm transition-colors duration-300">
        <div className="flex items-center gap-2.5 mb-6">
          <Logo size={34} />
          <span className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 tracking-tight">SpendSmart</span>
        </div>
        <h2 className="text-2xl font-bold mb-1 text-gray-800 dark:text-gray-100">Welcome back</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Sign in to your account</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-emerald-200 dark:border-gray-600 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-emerald-200 dark:border-gray-600 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm transition-colors"
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200 active:scale-[0.98]"
          >
            Log In
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-400 dark:text-gray-500">
          Don't have an account?{' '}
          <a href="/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Sign up</a>
        </p>
        {message && <p className="mt-2 text-sm text-center text-red-500">{message}</p>}
        {(showInstall || showIosBanner) && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {showInstall && (
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-800"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="3" x2="12" y2="15"/><polyline points="8 11 12 15 16 11"/><line x1="4" y1="20" x2="20" y2="20"/>
                </svg>
                Install SpendSmart as an app
              </button>
            )}
            {showIosBanner && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 flex-1">
                  Tap <span className="font-semibold">Share</span> then <span className="font-semibold">Add to Home Screen</span> to install
                </span>
                <button onClick={dismissIosBanner} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 text-lg leading-none transition-colors flex-shrink-0">×</button>
              </div>
            )}
          </div>
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

export default Login
