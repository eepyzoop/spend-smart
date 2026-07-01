import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Other']

function Settings() {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [categoryBudgets, setCategoryBudgets] = useState({})
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
        loadSettings(session.user.id)
      }
    })
  }, [])

  async function loadSettings(userId) {
    setFetching(true)

    const [{ data: profile }, { data: budgets }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('category_budgets').select('*').eq('user_id', userId),
    ])

    if (profile) {
      setDisplayName(profile.display_name || '')
      setMonthlyBudget(profile.monthly_budget ?? '')
    }

    if (budgets) {
      const map = {}
      budgets.forEach((b) => { map[b.category] = b.amount })
      setCategoryBudgets(map)
    }

    setFetching(false)
  }

  function handleCategoryChange(category, value) {
    setCategoryBudgets((prev) => ({ ...prev, [category]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName || null,
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

    if (rows.length > 0) {
      await supabase.from('category_budgets').upsert(rows, { onConflict: 'user_id,category' })
    }

    setSaving(false)
    setSaved(true)
  }

  if (!user || fetching) return null

  return (
    <div className="min-h-screen bg-emerald-50">
      <nav className="bg-emerald-700 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-wide">SpendSmart</h1>
        <Link
          to="/dashboard"
          className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm transition-colors"
        >
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-emerald-900">Settings</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest">Profile</h3>
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest">Monthly Budget</h3>
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">
                Overall Limit <span className="text-emerald-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest">Category Limits</h3>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">{cat}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="No limit"
                    value={categoryBudgets[cat] ?? ''}
                    onChange={(e) => handleCategoryChange(cat, e.target.value)}
                    className="flex-1 border border-emerald-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Settings'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default Settings
