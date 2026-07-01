import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useDarkMode } from './useDarkMode'
import { useAuth } from './useAuth'
import Sidebar from './Sidebar'
import Logo from './Logo'
import FlyingDollars from './FlyingDollars'
import FeedbackModal from './FeedbackModal'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Other']

function Settings() {
  const [dark, setDark] = useDarkMode()
  const user = useAuth()
  const [profile, setProfile] = useState(null)
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [categoryBudgets, setCategoryBudgets] = useState({})
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) loadSettings(user.id)
  }, [user?.id])

  async function loadSettings(userId) {
    setFetching(true)
    const [{ data: profileData }, { data: budgets }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('category_budgets').select('*').eq('user_id', userId),
    ])
    if (profileData) {
      setProfile(profileData)
      setMonthlyBudget(profileData.monthly_budget ?? '')
    }
    if (budgets) {
      const map = {}
      budgets.forEach((b) => { map[b.category] = b.amount })
      setCategoryBudgets(map)
    }
    setFetching(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function handleCategoryChange(category, value) {
    setCategoryBudgets((prev) => ({ ...prev, [category]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      monthly_budget: monthlyBudget === '' ? null : parseFloat(monthlyBudget),
      updated_at: new Date().toISOString(),
    })

    const rows = CATEGORIES
      .filter((cat) => categoryBudgets[cat] !== undefined && categoryBudgets[cat] !== '')
      .map((cat) => ({
        user_id: user.id,
        category: cat,
        amount: parseFloat(categoryBudgets[cat]),
        updated_at: new Date().toISOString(),
      }))

    let catError = null
    if (rows.length > 0) {
      const { error } = await supabase.from('category_budgets').upsert(rows, { onConflict: 'user_id,category' })
      catError = error
    }

    setSaving(false)
    if (!profileError && !catError) {
      setSaved(true)
    } else {
      setSaved('error')
    }
  }

  if (!user || fetching) return null

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
      <FlyingDollars />
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        user={user}
        profile={profile}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        profile={profile}
        dark={dark}
        setDark={setDark}
        onLogout={handleLogout}
        onFeedback={() => setFeedbackOpen(true)}
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
        <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">Budget</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 space-y-4 transition-colors duration-300">
            <h3 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Monthly Budget</h3>
            <div>
              <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                Overall Limit <span className="text-emerald-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={monthlyBudget}
                onChange={(e) => { setMonthlyBudget(e.target.value); setSaved(false) }}
                className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 space-y-4 transition-colors duration-300">
            <h3 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Category Limits</h3>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">{cat}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="No limit"
                    value={categoryBudgets[cat] ?? ''}
                    onChange={(e) => { handleCategoryChange(cat, e.target.value); setSaved(false) }}
                    className="flex-1 border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? 'Saving...' : saved === true ? 'Saved ✓' : saved === 'error' ? 'Save failed — try again' : 'Save Settings'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default Settings
