import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useDarkMode } from './useDarkMode'
import Logo from './Logo'
import FlyingDollars from './FlyingDollars'

function Login() {
  useDarkMode()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

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
