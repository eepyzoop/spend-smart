import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useDarkMode } from './useDarkMode'
import Sidebar from './Sidebar'
import Logo from './Logo'

function Profile() {
  const [dark, setDark] = useDarkMode()
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
        loadProfile(session.user.id)
      }
    })
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle()
    if (data) setDisplayName(data.display_name || '')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setSaved(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        profile={{ display_name: displayName }}
        dark={dark}
        setDark={setDark}
        onLogout={handleLogout}
      />

      <nav className="bg-emerald-700 dark:bg-emerald-900 text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex flex-col items-center justify-center gap-1 transition-colors"
          aria-label="Open menu"
        >
          <span className="block w-4 h-0.5 bg-white rounded-full" />
          <span className="block w-4 h-0.5 bg-white rounded-full" />
          <span className="block w-4 h-0.5 bg-white rounded-full" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Logo size={26} />
          <h1 className="text-lg font-semibold tracking-tight">SpendSmart</h1>
        </div>
        <button
          onClick={() => setDark(d => !d)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">Profile</h2>

        {/* Avatar card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {(displayName || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                {displayName || user.email.split('@')[0]}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Account Details</h3>
            <div>
              <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }}
                className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Profile'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default Profile
