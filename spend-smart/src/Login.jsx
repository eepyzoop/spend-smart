import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

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
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="bg-white border border-emerald-100 p-8 rounded-xl shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-2 text-emerald-800">Welcome Back</h2>
        <p className="text-sm text-emerald-500 mb-6">Sign in to your account</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-emerald-200 p-2 rounded-lg focus:outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-emerald-200 p-2 rounded-lg focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors">
            Log In
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-emerald-600">
          Don't have an account?{' '}
          <a href="/signup" className="font-semibold hover:underline">Sign up</a>
        </p>
        {message && <p className="mt-2 text-sm text-center text-emerald-700">{message}</p>}
      </div>
    </div>
  )
}

export default Login
