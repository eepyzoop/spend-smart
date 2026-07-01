import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useDarkMode } from './useDarkMode'

function Signup() {
  useDarkMode()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSignup(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email to confirm your account!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 p-8 rounded-xl shadow-md w-full max-w-sm transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-2 text-emerald-800 dark:text-emerald-300">Create Account</h2>
        <p className="text-sm text-emerald-500 dark:text-emerald-400 mb-6">Start tracking your spending</p>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-emerald-200 dark:border-gray-600 p-2 rounded-lg focus:outline-none focus:border-emerald-500 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-emerald-200 dark:border-gray-600 p-2 rounded-lg focus:outline-none focus:border-emerald-500 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-all duration-200 active:scale-[0.98]"
          >
            Sign Up
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-emerald-600 dark:text-emerald-400">
          Already have an account?{' '}
          <a href="/login" className="font-semibold hover:underline">Log in</a>
        </p>
        {message && <p className="mt-2 text-sm text-center text-emerald-700 dark:text-emerald-400">{message}</p>}
      </div>
    </div>
  )
}

export default Signup
