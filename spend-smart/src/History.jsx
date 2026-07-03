import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AiAssistant from './AiAssistant'
import { useDarkMode } from './useDarkMode'
import { useAuth } from './useAuth'
import Sidebar from './Sidebar'
import Logo from './Logo'
import FeedbackModal from './FeedbackModal'
import { useInstallPrompt } from './useInstallPrompt'
import InstallBanner from './InstallBanner'

const CATEGORY_COLORS = {
  Food:          { bar: '#10b981', light: '#d1fae5' },
  Transport:     { bar: '#06b6d4', light: '#cffafe' },
  Shopping:      { bar: '#8b5cf6', light: '#ede9fe' },
  Entertainment: { bar: '#f59e0b', light: '#fef3c7' },
  Health:        { bar: '#ef4444', light: '#fee2e2' },
  Bills:         { bar: '#f97316', light: '#ffedd5' },
  Other:         { bar: '#6b7280', light: '#f3f4f6' },
}

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return options
}

function SkeletonRow() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-gray-700 shadow-sm px-5 py-4 flex justify-between items-center animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-gray-600" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-emerald-100 dark:bg-gray-600 rounded" />
          <div className="h-2.5 w-16 bg-emerald-50 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="h-3 w-16 bg-emerald-100 dark:bg-gray-600 rounded" />
    </div>
  )
}

function exportToCSV(expenses, monthLabel) {
  const header = 'Date,Category,Amount,Note\n'
  const rows = expenses.map(e => {
    const date = new Date(e.created_at).toLocaleDateString('en-GB')
    const note = e.note ? `"${e.note.replace(/"/g, '""')}"` : ''
    return `${date},${e.category},${parseFloat(e.amount).toFixed(2)},${note}`
  }).join('\n')

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spendsmart-${monthLabel.replace(/\s/g, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function History() {
  const [dark, setDark] = useDarkMode()
  const user = useAuth()
  const [profile, setProfile] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [fetching, setFetching] = useState(true)
  const [monthOptions] = useState(getMonthOptions)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [barsAnimated, setBarsAnimated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const { showInstall, handleInstall, showIosBanner, dismissIosBanner } = useInstallPrompt()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    fetchExpenses(user.id, getMonthOptions()[0])
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user?.id])

  async function fetchExpenses(userId, { year, month }) {
    setFetching(true)
    setBarsAnimated(false)
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 1).toISOString()
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
    if (!error) setExpenses(data || [])
    else setExpenses([])
    setFetching(false)
    setTimeout(() => setBarsAnimated(true), 100)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function handleMonthChange(e) {
    const index = parseInt(e.target.value)
    setSelectedIndex(index)
    setSearch('')
    setFilterCategory('')
    fetchExpenses(user.id, monthOptions[index])
  }

  const categories = useMemo(() => [...new Set(expenses.map(e => e.category))], [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = !search ||
        e.note?.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !filterCategory || e.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [expenses, search, filterCategory])

  const total = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const categoryTotals = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  if (!user) return null

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
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
        {showInstall && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white/90 hover:bg-emerald-600 dark:hover:bg-emerald-800 border border-white/20 transition-colors whitespace-nowrap"
            title="Install SpendSmart"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="3" x2="12" y2="15"/><polyline points="8 11 12 15 16 11"/><line x1="4" y1="20" x2="20" y2="20"/>
            </svg>
            Install
          </button>
        )}
        <button
          onClick={() => setAiOpen(o => !o)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors text-base"
          title="AI Assistant"
        >
          ✨
        </button>
        <button
          onClick={() => setDark(d => !d)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>
      {showIosBanner && <InstallBanner onDismiss={dismissIosBanner} />}

      <main className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">Spending History</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(filteredExpenses, monthOptions[selectedIndex].label)}
              disabled={filteredExpenses.length === 0}
              className="bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 active:scale-95"
              title="Export to CSV"
            >
              ↓ CSV
            </button>
            <select
              value={selectedIndex}
              onChange={handleMonthChange}
              className="border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
            >
              {monthOptions.map((opt, i) => (
                <option key={i} value={i}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 dark:from-emerald-800 dark:to-emerald-950 text-white rounded-2xl shadow-md p-6 transition-colors duration-300">
          <p className="text-emerald-300 text-xs font-medium uppercase tracking-wider mb-2">{monthOptions[selectedIndex].label}</p>
          <p className="text-4xl font-light tracking-tight">Rs {total.toFixed(2)}</p>
          <p className="text-emerald-300 text-sm mt-2">
            {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Category breakdown */}
        {sortedCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-5">
              Spending by Category
            </h2>
            <div className="space-y-4">
              {sortedCategories.map(([cat, catTotal]) => {
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
                const rawPct = (catTotal / total) * 100
                const pct = rawPct > 0 && rawPct < 1 ? '<1' : Math.round(rawPct)
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{pct}%</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rs {catTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.light }}>
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: barsAnimated ? `${rawPct}%` : '0%',
                          backgroundColor: colors.bar,
                          transition: 'width 0.6s ease-out',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by note or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
          >
            <option value="">All</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-3">
            Transactions
          </h2>
          {fetching ? (
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-gray-700 shadow-sm p-10 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {expenses.length === 0 ? 'No expenses this month' : 'No results found'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {expenses.length === 0 ? 'Try selecting a different month.' : 'Try a different search or filter.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredExpenses.map((expense) => {
                const colors = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other
                const date = new Date(expense.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
                return (
                  <li
                    key={expense.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-gray-700 shadow-sm px-5 py-4 flex justify-between items-center hover:shadow-md hover:scale-[1.005] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{expense.category}</p>
                        {expense.note && <p className="text-sm text-gray-400 dark:text-gray-500">{expense.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Rs {parseFloat(expense.amount).toFixed(2)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>

      <AiAssistant
        periodLabel={monthOptions[selectedIndex].label}
        total={total}
        transactionCount={filteredExpenses.length}
        categoryTotals={sortedCategories.map(([cat, amt]) => ({ category: cat, amount: amt.toFixed(2) }))}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </div>
  )
}

export default History
